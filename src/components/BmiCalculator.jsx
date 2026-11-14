import { useState } from 'react'
import { Activity } from 'lucide-react'
import { bmiStatus, calculateBmi, toneClasses } from '../lib/ranges.js'

const STORAGE_KEY = 'medimind-height-cm'

function loadHeight() {
  try {
    return localStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

// BMI from your latest logged weight and a height you enter (remembered in this browser only).
export default function BmiCalculator({ weight }) {
  const [height, setHeight] = useState(loadHeight)
  const [manualWeight, setManualWeight] = useState('')

  function changeHeight(value) {
    setHeight(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // storage unavailable: the value just isn't remembered
    }
  }

  const usedWeight = manualWeight !== '' ? Number(manualWeight) : weight
  const bmi = calculateBmi(usedWeight, Number(height))
  const status = bmi && bmiStatus(bmi)

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </span>
        {status && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClasses[status.tone]}`}>
            {status.label}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">BMI calculator</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{bmi ? bmi.toFixed(1) : '--'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="bmi-height" className="mb-1 block text-xs font-medium text-slate-600">Height (cm)</label>
          <input id="bmi-height" className="input" type="number" min="50" max="250" placeholder="170"
            value={height} onChange={(e) => changeHeight(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bmi-weight" className="mb-1 block text-xs font-medium text-slate-600">Weight (kg)</label>
          <input id="bmi-weight" className="input" type="number" min="1" max="500" step="0.1"
            placeholder={weight ? String(weight) : '70'} value={manualWeight}
            onChange={(e) => setManualWeight(e.target.value)} />
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-500">Uses your latest reading unless you type a weight.</p>
    </div>
  )
}
