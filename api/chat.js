import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const MAX_MESSAGE_LENGTH = 500
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'

const SYSTEM_PROMPT = `You are a health information assistant.
Give general educational information only. Do not diagnose conditions or prescribe medication.
If the user describes symptoms that could be an emergency (chest pain, trouble breathing, stroke signs, severe bleeding, thoughts of self-harm), tell them to contact local emergency services immediately.
Keep answers short and clear. Remind users to consult a doctor for personal medical decisions.`

// Local model (LM Studio, Ollama, etc.): any server that speaks the OpenAI chat API.
// Only used when OPENAI_BASE_URL is a real http(s) URL, e.g. http://localhost:1234/v1
const LOCAL_URL = /^https?:\/\//.test(process.env.OPENAI_BASE_URL || '')
  ? process.env.OPENAI_BASE_URL.replace(/\/$/, '')
  : null

async function askLocalModel(system, turns) {
  const response = await fetch(`${LOCAL_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY || 'lm-studio'}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL,
      messages: [{ role: 'system', content: system }, ...turns],
      max_tokens: 600,
      temperature: 0.4,
    }),
    signal: AbortSignal.timeout(120_000), // local models can be slow
  })
  if (!response.ok) {
    const err = new Error(`Local model returned ${response.status}: ${await response.text()}`)
    err.status = response.status
    throw err
  }
  const data = await response.json()
  // Some models print their reasoning inside <think> tags: hide it from the user
  return data.choices?.[0]?.message?.content?.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
}

async function askGemini(system, turns) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  const request = {
    model: MODEL,
    contents: turns.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    config: { systemInstruction: system, maxOutputTokens: 600 },
  }
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

  // 1. Authenticate: the browser sends the Supabase access token
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Not logged in' })

  // 2. Validate input
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
  if (!message) return res.status(400).json({ error: 'Message is required' })
  if (message.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer` })
  }

  try {
    // Client acts as the user, so Row Level Security applies to every query
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !userData?.user) return res.status(401).json({ error: 'Invalid session' })

    // 3. Load context: recent vitals and recent chat turns
    const [{ data: vitals }, { data: history }] = await Promise.all([
      supabase.from('vitals').select('heart_rate, systolic, diastolic, weight, created_at')
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('messages').select('role, content')
        .order('created_at', { ascending: false }).limit(6),
    ])

    const vitalsText = vitals?.length
      ? vitals.map((v) => `${v.created_at.slice(0, 10)}: HR ${v.heart_rate} bpm, BP ${v.systolic}/${v.diastolic}, weight ${v.weight} kg`).join('\n')
      : 'No readings recorded yet.'

    const system = `${SYSTEM_PROMPT}\n\nThe user's latest readings:\n${vitalsText}`
    const turns = [...(history || []).reverse(), { role: 'user', content: message }]

    // 4. Ask the model: a local OpenAI-compatible server (e.g. LM Studio) if configured, else Gemini
    const text = LOCAL_URL ? await askLocalModel(system, turns) : await askGemini(system, turns)
    const reply = text || 'Sorry, I could not generate a response. Please try rephrasing.'

    // 5. Save both turns
    await supabase.from('messages').insert([
      { role: 'user', content: message },
      { role: 'assistant', content: reply },
    ])

    return res.status(200).json({ reply })
  } catch (err) {
    console.error('chat error:', err)
    if (err.status === 503 || err.status === 429) {
      return res.status(503).json({ error: 'The AI service is busy right now. Please try again in a moment.' })
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
