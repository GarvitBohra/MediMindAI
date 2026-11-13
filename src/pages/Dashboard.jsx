import { useCallback, useEffect, useState } from 'react'
import { Heart, Droplets, Scale } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { bloodPressureStatus, heartRateStatus, toneClasses } from '../lib/ranges.js'
import VitalsForm from '../components/VitalsForm.jsx'
import VitalsChart from '../components/VitalsChart.jsx'
import StatCard from '../components/StatCard.jsx'

export default function Dashboard() {
  const [vitals, setVitals] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    // RLS limits this to the logged-in user's rows
    const { data, error } = await supabase
      .from('vitals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    if (error) setError(error.message)
    else setVitals(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const latest = vitals[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Health dashboard</h1>
        <p className="text-sm text-slate-500">
          {latest ? `Last reading: ${new Date(latest.created_at).toLocaleString()}` : 'Add your first reading to get started.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Heart} label="Heart rate" value={latest?.heart_rate} unit="bpm"
          status={latest && heartRateStatus(latest.heart_rate)} accent="bg-rose-50 text-rose-600" />
        <StatCard icon={Droplets} label="Blood pressure" value={latest && `${latest.systolic}/${latest.diastolic}`} unit="mmHg"
          status={latest && bloodPressureStatus(latest.systolic, latest.diastolic)} accent="bg-teal-50 text-teal-600" />
        <StatCard icon={Scale} label="Weight" value={latest?.weight} unit="kg" accent="bg-sky-50 text-sky-600" />
      </div>

      <VitalsForm onAdded={load} />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : vitals.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No readings yet. Record your first one above.</div>
      ) : (
        <>
          <VitalsChart vitals={vitals} />
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-900">History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Heart rate</th>
                    <th className="px-5 py-3 font-medium">Blood pressure</th>
                    <th className="px-5 py-3 font-medium">Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vitals.map((v) => {
                    const hr = heartRateStatus(v.heart_rate)
                    const bp = bloodPressureStatus(v.systolic, v.diastolic)
                    return (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-slate-600">{new Date(v.created_at).toLocaleString()}</td>
                        <td className="px-5 py-3">
                          {v.heart_rate} bpm{' '}
                          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[hr.tone]}`}>{hr.label}</span>
                        </td>
                        <td className="px-5 py-3">
                          {v.systolic}/{v.diastolic}{' '}
                          <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[bp.tone]}`}>{bp.label}</span>
                        </td>
                        <td className="px-5 py-3">{v.weight} kg</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Status labels use general adult reference ranges for information only and are not a diagnosis.
          </p>
        </>
      )}
    </div>
  )
}
