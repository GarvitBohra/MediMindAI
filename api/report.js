import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'
const MAX_PDF_BYTES = 3 * 1024 * 1024 // Vercel request bodies are capped at about 4.5 MB (base64 adds a third)

const PROMPT = `You are a health information assistant. Read the attached medical or lab report (PDF).
Return ONLY JSON with this shape:
{"title": string, "parameters": [{"name": string, "value": number, "unit": string, "ref_low": number|null, "ref_high": number|null, "explanation": string}], "summary": string}
Rules:
- Include only numeric values that are printed in the report. Never invent values.
- ref_low / ref_high come only from the reference range printed in the report; use null when it is missing.
- "explanation": 1-2 plain-language sentences on what the test measures and what a value outside the range can mean in general.
- "summary": a short note to discuss with a doctor: key findings, which values are outside their range, and 3 questions to ask.
- Do not diagnose and do not recommend medications or doses.
- If the document has no lab values, return an empty "parameters" list and explain in "summary".`

async function generate(ai, request) {
  try {
    return (await ai.models.generateContent(request)).text
  } catch (err) {
    // Gemini sometimes returns 503 (busy) or 429 (rate limit): wait briefly and retry once
    if (err.status !== 503 && err.status !== 429) throw err
    await new Promise((r) => setTimeout(r, 2000))
    return (await ai.models.generateContent(request)).text
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1]
  if (!token) return res.status(401).json({ error: 'Not logged in' })

  const data = req.body?.data
  if (typeof data !== 'string' || !data) return res.status(400).json({ error: 'A PDF file is required' })
  const bytes = Buffer.from(data, 'base64')
  if (bytes.length > MAX_PDF_BYTES) return res.status(413).json({ error: 'The PDF must be 3 MB or smaller' })
  if (bytes.subarray(0, 5).toString() !== '%PDF-') return res.status(400).json({ error: 'Only PDF files are supported' })

  try {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' })

    if (!process.env.GEMINI_API_KEY || /^https?:\/\//.test(process.env.OPENAI_BASE_URL || '')) {
      return res.status(501).json({ error: 'Report analysis needs Gemini. Remove OPENAI_BASE_URL and set GEMINI_API_KEY.' })
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    const text = await generate(ai, {
      model: MODEL,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data } }, { text: PROMPT }] }],
      config: { responseMimeType: 'application/json', maxOutputTokens: 16000 },
    })

    let report
    try {
      // Models sometimes wrap JSON in ```json fences even when asked not to
      report = JSON.parse(String(text).replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''))
    } catch {
      console.error('report: model did not return valid JSON. Start of reply:', String(text).slice(0, 300), '... length', String(text).length)
      return res.status(502).json({ error: 'Could not read the report. Please try another PDF.' })
    }
    // Keep only well-formed numeric rows
    const parameters = (Array.isArray(report.parameters) ? report.parameters : []).filter(
      (p) => p && typeof p.name === 'string' && typeof p.value === 'number',
    )
    return res.status(200).json({
      title: String(report.title || 'Medical report').slice(0, 120),
      parameters,
      summary: String(report.summary || ''),
    })
  } catch (err) {
    console.error('report error:', err)
    if (err.status === 503 || err.status === 429) {
      return res.status(503).json({ error: 'The AI service is busy right now. Please try again in a moment.' })
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
