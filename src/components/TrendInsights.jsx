import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { askAssistant } from '../lib/api.js'

export default function TrendInsights({ count }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function explain() {
    setBusy(true)
    setError('')
    try {
      setText(await askAssistant({ mode: 'trends' }))
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-teal-600" aria-hidden="true" /> AI explanation of your trends
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">A plain-language summary of your recent readings.</p>
        </div>
        <button onClick={explain} disabled={busy || count < 2} className="btn-primary">
          {busy ? 'Analysing...' : text ? 'Refresh' : 'Explain my trends'}
        </button>
      </div>
      {count < 2 && <p className="mt-3 text-sm text-slate-500">Add at least 2 readings to see trends.</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {text && <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{text}</p>}
      {text && <p className="mt-3 text-xs text-slate-500">Informational only, not a diagnosis.</p>}
    </div>
  )
}
