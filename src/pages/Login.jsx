import { useState } from 'react'
import { Activity, LineChart, ShieldCheck, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import Logo from '../components/Logo.jsx'

const points = [
  { icon: Activity, title: 'Track your vitals', text: 'Log heart rate, blood pressure and weight in seconds.' },
  { icon: LineChart, title: 'See your trends', text: 'Charts and reference ranges show how you are doing over time.' },
  { icon: Sparkles, title: 'Ask the AI assistant', text: 'Get general health information that takes your readings into account.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Your data is protected so only you can see it.' },
]

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [message, setMessage] = useState({ text: '', error: false })
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setMessage({ text: '', error: false })
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage({ text: error.message, error: true })
    else if (isSignUp) {
      setMessage({ text: 'Account created. If email confirmation is on, check your inbox, then log in.', error: false })
    }
    setBusy(false)
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="hidden bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo light />
        <div>
          <h1 className="text-4xl font-bold leading-tight">Understand your health,<br />one reading at a time.</h1>
          <ul className="mt-10 space-y-6">
            {points.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-teal-50/90">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-teal-100/80">Educational project. Not a substitute for professional medical advice.</p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h2 className="text-2xl font-bold text-slate-900">{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {isSignUp ? 'Start tracking your health in a minute.' : 'Log in to see your dashboard.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input id="email" type="email" required className="input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input id="password" type="password" required minLength={6} className="input" placeholder="At least 6 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button disabled={busy} className="btn-primary w-full">
              {busy ? 'Please wait...' : isSignUp ? 'Create account' : 'Log in'}
            </button>
            {message.text && (
              <p className={`rounded-lg px-3 py-2 text-sm ${message.error ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-800'}`}>
                {message.text}
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isSignUp ? 'Already have an account?' : 'New to MediMindAI?'}{' '}
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="font-semibold text-teal-700 hover:underline">
              {isSignUp ? 'Log in' : 'Create an account'}
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}
