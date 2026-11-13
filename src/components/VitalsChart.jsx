import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function VitalsChart({ vitals }) {
  // vitals arrive newest first; the chart wants oldest first
  const data = [...vitals].reverse().map((v) => ({
    date: new Date(v.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    'Heart rate': v.heart_rate,
    Systolic: v.systolic,
    Diastolic: v.diastolic,
  }))

  return (
    <div className="card p-5">
      <h2 className="text-base font-semibold text-slate-900">Trends</h2>
      <p className="mt-0.5 text-sm text-slate-500">Your last {vitals.length} readings.</p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line type="monotone" dataKey="Heart rate" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Systolic" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Diastolic" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
