import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

const MAX_MESSAGE_LENGTH = 500
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite'

const SYSTEM_PROMPT = `You are MediMind, an experienced virtual medical assistant with the knowledge of a physician and a warm, professional manner.
Give practical, specific help, not generic disclaimers:
- Interpret the user's readings against standard adult reference ranges and explain what they mean and any trend you can see.
- Suggest evidence-based next steps: lifestyle changes (diet, sleep, exercise, stress, alcohol, salt), how to measure vitals accurately, what to monitor and for how long.
- Explain conditions, tests, and medications in plain language, including common side effects and general safety points.
- Suggest what kind of doctor to see, how urgent it is, and good questions to ask at the appointment.
- Ask a brief clarifying question when symptoms or context are missing.
Limits: you cannot examine the user, so do not give a definitive diagnosis and do not prescribe or give doses; say what is likely or possible and what a clinician should confirm.
If the user describes possible emergency symptoms (chest pain, trouble breathing, stroke signs, severe bleeding, fainting, thoughts of self-harm), tell them to contact local emergency services immediately.
Keep answers clear and well organised, under about 200 words, and end with a one-line reminder to confirm important decisions with their doctor.`

const TRENDS_PROMPT = `Task: explain the trends in the readings below. For each metric that has data (heart rate, blood pressure, blood sugar, weight), say whether it is rising, falling or stable and whether any value is outside the usual adult range. Mention likely everyday influences, give 2-3 practical suggestions, and say when to see a doctor. Use short bullet points, under 180 words. If there are fewer than 3 readings, say the trend is not clear yet.`

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
      max_tokens: 900,
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
    config: { systemInstruction: system, maxOutputTokens: 900 },
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
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1]
  if (!token) return res.status(401).json({ error: 'Not logged in' })

  // 2. Validate input
  // mode 'trends': explain the user's recent readings. Reads more vitals and is not saved to the chat history.
  const isTrends = req.body?.mode === 'trends'
  const message = isTrends
    ? 'Explain the trends in my recent readings.'
    : typeof req.body?.message === 'string' ? req.body.message.trim() : ''
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
    const [{ data: vitals, error: vitalsError }, { data: history, error: historyError }] = await Promise.all([
      supabase.from('vitals').select('heart_rate, systolic, diastolic, weight, blood_sugar, created_at')
        .order('created_at', { ascending: false }).limit(isTrends ? 30 : 5),
      isTrends
        ? { data: [] }
        : supabase.from('messages').select('role, content').order('created_at', { ascending: false }).limit(6),
    ])

    // Don't let the model answer from a false "no readings" context if a read failed
    if (vitalsError || historyError) throw vitalsError || historyError

    const vitalsText = vitals?.length
      ? vitals.map((v) => `${v.created_at.slice(0, 10)}: HR ${v.heart_rate} bpm, BP ${v.systolic}/${v.diastolic}, weight ${v.weight} kg${v.blood_sugar != null ? `, blood sugar ${v.blood_sugar} mg/dL` : ''}`).join('\n')
      : 'No readings recorded yet.'

    const task = isTrends ? `\n\n${TRENDS_PROMPT}` : ''
    const system = `${SYSTEM_PROMPT}${task}\n\nThe user's ${isTrends ? 'recent' : 'latest'} readings (newest first):\n${vitalsText}`
    const turns = [...(history || []).reverse(), { role: 'user', content: message }]

    // 4. Ask the model: a local OpenAI-compatible server (e.g. LM Studio) if configured, else Gemini
    const text = LOCAL_URL ? await askLocalModel(system, turns) : await askGemini(system, turns)
    const reply = text || 'Sorry, I could not generate a response. Please try rephrasing.'

    // 5. Save both turns (trend explanations are not part of the conversation)
    if (!isTrends) {
      const { error: saveError } = await supabase.from('messages').insert([
        { role: 'user', content: message },
        { role: 'assistant', content: reply },
      ])
      if (saveError) console.error('failed to save messages:', saveError)
    }

    return res.status(200).json({ reply })
  } catch (err) {
    console.error('chat error:', err)
    if (err.status === 503 || err.status === 429) {
      return res.status(503).json({ error: 'The AI service is busy right now. Please try again in a moment.' })
    }
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
