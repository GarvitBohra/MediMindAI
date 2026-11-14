import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// One small line chart. `lines` is a list of { key, color }.
function TrendChart({ title, unit, data, lines }) {
  const hasData = data.some((d) => lines.some((l) => d[l.key] != null))
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-900">
        {title} <span className="font-normal text-slate-500">({unit})</span>
      </h3>
      {hasData ? (
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} stroke="#cbd5e1" domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 13 }} />
              {lines.length > 1 && <Legend wrapperStyle={{ fontSize: 13 }} />}
              {lines.map((l) => (
                <Line key={l.key} type="monotone" dataKey={l.key} stroke={l.color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">No data yet.</p>
      )}
    </div>
  )
}

export default function VitalsChart({ vitals }) {
  // vitals arrive newest first; the charts want oldest first
  const data = [...vitals].reverse().map((v) => ({
    date: new Date(v.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    'Heart rate': v.heart_rate,
    Systolic: v.systolic,
    Diastolic: v.diastolic,
    'Blood sugar': v.blood_sugar,
    Weight: v.weight,
  }))

  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900">Trends</h2>
      <p className="mt-0.5 text-sm text-slate-500">Your last {vitals.length} readings.</p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <TrendChart title="Blood pressure" unit="mmHg" data={data}
          lines={[{ key: 'Systolic', color: '#0d9488' }, { key: 'Diastolic', color: '#0284c7' }]} />
        <TrendChart title="Heart rate" unit="bpm" data={data} lines={[{ key: 'Heart rate', color: '#e11d48' }]} />
        <TrendChart title="Blood sugar" unit="mg/dL" data={data} lines={[{ key: 'Blood sugar', color: '#d97706' }]} />
        <TrendChart title="Weight" unit="kg" data={data} lines={[{ key: 'Weight', color: '#7c3aed' }]} />
      </div>
    </section>
  )
}
