import { useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const empty = { heart_rate: '', systolic: '', diastolic: '', weight: '' }

const fields = [
  { key: 'heart_rate', label: 'Heart rate (bpm)', min: 20, max: 250, placeholder: '72' },
  { key: 'systolic', label: 'Systolic (mmHg)', min: 50, max: 260, placeholder: '120' },
  { key: 'diastolic', label: 'Diastolic (mmHg)', min: 30, max: 160, placeholder: '80' },
  { key: 'weight', label: 'Weight (kg)', min: 1, max: 500, step: '0.1', placeholder: '70' },
]

export default function VitalsForm({ onAdded }) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    // user_id is filled by the database default (auth.uid())
    const { error } = await supabase.from('vitals').insert({
      heart_rate: Number(form.heart_rate),
      systolic: Number(form.systolic),
      diastolic: Number(form.diastolic),
      weight: Number(form.weight),
    })
    if (error) setError(error.message)
    else {
      setForm(empty)
      onAdded()
    }
    setBusy(false)
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5">
      <h2 className="text-base font-semibold text-slate-900">Record a new reading</h2>
      <p className="mt-0.5 text-sm text-slate-500">Enter your latest measurements.</p>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className="mb-1 block text-xs font-medium text-slate-600">{f.label}</label>
            <input
              id={f.key} className="input" type="number" required min={f.min} max={f.max} step={f.step}
              placeholder={f.placeholder} value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button disabled={busy} className="btn-primary">
          <Plus className="h-4 w-4" aria-hidden="true" /> {busy ? 'Saving...' : 'Save reading'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  )
}
