import { useCallback, useEffect, useState } from 'react'
import { Heart, Droplets, Droplet, Scale, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { bloodPressureStatus, bloodSugarStatus, heartRateStatus, toneClasses } from '../lib/ranges.js'
import VitalsForm from '../components/VitalsForm.jsx'
import VitalsChart from '../components/VitalsChart.jsx'
import StatCard from '../components/StatCard.jsx'
import BmiCalculator from '../components/BmiCalculator.jsx'
import TrendInsights from '../components/TrendInsights.jsx'

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

  async function remove(id) {
    if (!window.confirm('Delete this reading? This cannot be undone.')) return
    setError('')
    // RLS only allows deleting the logged-in user's own rows
    const { data, error } = await supabase.from('vitals').delete().eq('id', id).select()
    if (error) setError(`Could not delete the reading: ${error.message}`)
    else if (!data?.length) setError('Nothing was deleted. Run the latest supabase/schema.sql in the Supabase SQL editor to add the delete policy.')
    else load()
  }

  useEffect(() => {
    load()
  }, [load])

  const latest = vitals[0]
  // Blood sugar is optional, so the latest value may come from an earlier reading
  const latestSugar = vitals.find((v) => v.blood_sugar != null)?.blood_sugar

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Health dashboard</h1>
        <p className="text-sm text-slate-500">
          {latest ? `Last reading: ${new Date(latest.created_at).toLocaleString()}` : 'Add your first reading to get started.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Heart} label="Heart rate" value={latest?.heart_rate} unit="bpm"
          status={latest && heartRateStatus(latest.heart_rate)} accent="bg-rose-50 text-rose-600" />
        <StatCard icon={Droplets} label="Blood pressure" value={latest && `${latest.systolic}/${latest.diastolic}`} unit="mmHg"
          status={latest && bloodPressureStatus(latest.systolic, latest.diastolic)} accent="bg-teal-50 text-teal-600" />
        <StatCard icon={Droplet} label="Blood sugar" value={latestSugar} unit="mg/dL"
          status={latestSugar != null ? bloodSugarStatus(latestSugar) : undefined} accent="bg-amber-50 text-amber-600" />
        <StatCard icon={Scale} label="Weight" value={latest?.weight} unit="kg" accent="bg-sky-50 text-sky-600" />
        <BmiCalculator weight={latest?.weight} />
      </div>

      <VitalsForm onAdded={load} />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : vitals.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No readings yet. Record your first one above.</div>
      ) : (
        <>
          <TrendInsights count={vitals.length} />
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
                    <th className="px-5 py-3 font-medium">Blood sugar</th>
                    <th className="px-5 py-3 font-medium">Weight</th>
                    <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
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
                        <td className="px-5 py-3">
                          {v.blood_sugar == null ? '--' : (
                            <>
                              {v.blood_sugar} mg/dL{' '}
                              <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[bloodSugarStatus(v.blood_sugar).tone]}`}>{bloodSugarStatus(v.blood_sugar).label}</span>
                            </>
                          )}
                        </td>
                        <td className="px-5 py-3">{v.weight} kg</td>
                        <td className="px-5 py-3 text-right">
                          <button type="button" onClick={() => remove(v.id)} aria-label="Delete reading"
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </td>
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
