import { supabase } from './supabase.js'

// Calls a serverless endpoint as the logged-in user and returns the parsed JSON body.
async function callApi(path, payload) {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw new Error('Your session has expired. Please log in again.')
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(payload),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

export async function askAssistant(payload) {
  const { reply } = await callApi('/api/chat', payload)
  if (!reply) throw new Error('The assistant sent an empty reply. Please try again.')
  return reply
}

const MAX_PDF_BYTES = 3 * 1024 * 1024

// Sends a PDF to /api/report and returns { title, parameters, summary }.
export async function analyzeReport(file) {
  if (file.type !== 'application/pdf') throw new Error('Please choose a PDF file.')
  if (file.size > MAX_PDF_BYTES) throw new Error('The PDF must be 3 MB or smaller.')
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return callApi('/api/report', { data: btoa(binary) })
}
