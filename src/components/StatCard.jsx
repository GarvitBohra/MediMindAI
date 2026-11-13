import { toneClasses } from '../lib/ranges.js'

export default function StatCard({ icon: Icon, label, value, unit, status, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {status && (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${toneClasses[status.tone]}`}>
            {status.label}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">
        {value ?? '--'}
        {value != null && <span className="ml-1 text-base font-medium text-slate-500">{unit}</span>}
      </p>
    </div>
  )
}
