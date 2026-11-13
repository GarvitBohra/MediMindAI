import { HeartPulse } from 'lucide-react'

export default function Logo({ light = false }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${light ? 'bg-white/15' : 'bg-teal-600'}`}>
        <HeartPulse className="h-5 w-5 text-white" aria-hidden="true" />
      </span>
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        MediMind<span className={light ? 'text-teal-200' : 'text-teal-600'}>AI</span>
      </span>
    </div>
  )
}
