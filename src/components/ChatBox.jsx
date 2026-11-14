import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Trash2, TriangleAlert, User } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { askAssistant } from '../lib/api.js'

const MAX_LENGTH = 500

const suggestions = [
  'Is my latest blood pressure normal?',
  'What affects resting heart rate?',
  'How can I lower my blood pressure naturally?',
]

export default function ChatBox() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    supabase
      .from('messages')
      .select('id, role, content')
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => setMessages(data || []))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy])

  async function clearChat() {
    if (busy || messages.length === 0) return
    if (!window.confirm('Clear the whole conversation? This cannot be undone.')) return
    setError('')
    // RLS limits the delete to the logged-in user's rows; the filter is required by Supabase
    const { data, error } = await supabase.from('messages').delete().gt('id', 0).select('id')
    if (error) setError(`Could not clear the chat: ${error.message}`)
    else if (!data?.length) setError('Nothing was deleted. Run the latest supabase/schema.sql in the Supabase SQL editor to add the delete policy.')
    else setMessages([])
  }

  async function send(text) {
    const message = text.trim()
    if (!message || busy) return
    setBusy(true)
    setError('')
    setInput('')
    const tempId = `tmp-${crypto.randomUUID()}`
    setMessages((m) => [...m, { id: tempId, role: 'user', content: message }])

    try {
      const reply = await askAssistant({ message })
      setMessages((m) => [...m, { id: `bot-${crypto.randomUUID()}`, role: 'assistant', content: reply }])
    } catch (err) {
      // Roll back the optimistic bubble and give the text back so it can be resent
      setMessages((m) => m.filter((x) => x.id !== tempId))
      setInput(message)
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="card flex h-[calc(100vh-14rem)] min-h-[28rem] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-200 p-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
          <Bot className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">MediMind Assistant</p>
          <p className="text-xs text-slate-500">Medical guidance based on your readings</p>
        </div>
        <button type="button" onClick={clearChat} disabled={busy || messages.length === 0}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40">
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Clear chat
        </button>
      </div>

      <div className="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        This is not medical advice. For emergencies, call your local emergency number.
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-4" aria-live="polite">
        {messages.length === 0 && !busy && (
          <div className="mx-auto mt-6 max-w-md text-center">
            <p className="font-medium text-slate-700">How can I help today?</p>
            <p className="mt-1 text-sm text-slate-500">Ask a question, or pick one to start.</p>
            <div className="mt-4 flex flex-col gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-700 transition hover:border-teal-600 hover:text-teal-700">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => {
          const isUser = m.role === 'user'
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isUser ? 'bg-slate-200 text-slate-600' : 'bg-teal-600 text-white'}`}>
                {isUser ? <User className="h-4 w-4" aria-hidden="true" /> : <Bot className="h-4 w-4" aria-hidden="true" />}
              </span>
              <p className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                isUser ? 'rounded-br-sm bg-teal-600 text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
              }`}>
                {m.content}
              </p>
            </div>
          )
        })}

        {busy && (
          <div className="flex items-end gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-white">
              <Bot className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-500">Thinking...</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex gap-2 border-t border-slate-200 bg-white p-3">
        <input value={input} maxLength={MAX_LENGTH} onChange={(e) => setInput(e.target.value)}
          placeholder="Type your question..." className="input" aria-label="Your question" />
        <button disabled={busy || !input.trim()} className="btn-primary" aria-label="Send">
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
