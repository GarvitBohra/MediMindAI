import { useCallback, useEffect, useState } from 'react'
import { Copy, FileText, Trash2, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { analyzeReport } from '../lib/api.js'
import { flagValue, toneClasses } from '../lib/ranges.js'

function ReportView({ report }) {
  const [copied, setCopied] = useState(false)

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(report.summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable: the text is still selectable on screen
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900">{report.title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          AI-read values can contain mistakes. Check them against your original report.
        </p>
      </div>
      {report.parameters.length === 0 ? (
        <p className="p-5 text-sm text-slate-500">No lab values were found in this PDF.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Test</th>
                <th className="px-5 py-3 font-medium">Value</th>
                <th className="px-5 py-3 font-medium">Reference</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">What it means</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.parameters.map((p, i) => {
                const flag = flagValue(p.value, p.ref_low, p.ref_high)
                const outOfRange = flag.label === 'Low' || flag.label === 'High'
                return (
                  <tr key={i} className={outOfRange ? 'bg-red-50/40' : ''}>
                    <td className="px-5 py-3 font-medium text-slate-800">{p.name}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{p.value} {p.unit}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-slate-500">
                      {p.ref_low ?? '?'} - {p.ref_high ?? '?'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[flag.tone]}`}>{flag.label}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{p.explanation}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="border-t border-slate-200 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Summary to discuss with your doctor</h3>
          <button type="button" onClick={copySummary} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-teal-600 hover:text-teal-700">
            <Copy className="h-3.5 w-3.5" aria-hidden="true" /> {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{report.summary}</p>
        <p className="mt-3 text-xs text-slate-500">Informational only, not a diagnosis.</p>
      </div>
    </div>
  )
}

export default function Reports() {
  const [current, setCurrent] = useState(null)
  const [saved, setSaved] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadSaved = useCallback(async () => {
    const { data, error } = await supabase
      .from('reports')
      .select('id, title, parameters, summary, created_at')
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) setError(error.message)
    else setSaved(data)
  }, [])

  useEffect(() => {
    loadSaved()
  }, [loadSaved])

  async function handleFile(e) {
    const file = e.target.files[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const report = await analyzeReport(file)
      setCurrent(report)
      // user_id is filled by the database default (auth.uid())
      const { error } = await supabase.from('reports').insert(report)
      if (error) setError(`Analysed, but could not save: ${error.message}`)
      else loadSaved()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function remove(id) {
    if (!window.confirm('Delete this saved report? This cannot be undone.')) return
    setError('')
    const { data, error } = await supabase.from('reports').delete().eq('id', id).select('id')
    if (error) setError(`Could not delete: ${error.message}`)
    else if (!data?.length) setError('Nothing was deleted. Run the latest supabase/schema.sql in the Supabase SQL editor.')
    else {
      setSaved((s) => s.filter((r) => r.id !== id))
      setCurrent((c) => (c?.id === id ? null : c))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Medical reports</h1>
        <p className="text-sm text-slate-500">Upload a blood test or lab report (PDF) to get it explained in plain language.</p>
      </div>

      <div className="card p-5">
        <label className="btn-primary cursor-pointer">
          <Upload className="h-4 w-4" aria-hidden="true" /> {busy ? 'Analysing...' : 'Upload PDF'}
          <input type="file" accept="application/pdf" className="sr-only" disabled={busy} onChange={handleFile} />
        </label>
        <p className="mt-3 text-xs text-slate-500">
          PDF up to 3 MB. The file is sent to the AI service to be read and is not stored. Only the results are saved to your account.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {current && <ReportView report={current} />}

      {saved.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-900">Saved reports</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {saved.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <button type="button" onClick={() => setCurrent(r)} className="flex-1 text-left text-sm text-slate-700 hover:text-teal-700">
                  {r.title} <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </button>
                <button type="button" onClick={() => remove(r.id)} aria-label="Delete report"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
