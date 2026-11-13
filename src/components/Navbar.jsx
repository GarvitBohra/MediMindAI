import { NavLink } from 'react-router-dom'
import { LayoutDashboard, LogOut, MessageSquare } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import Logo from './Logo.jsx'

const link = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

export default function Navbar() {
  const { session } = useAuth()
  const email = session?.user?.email || ''

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
        <Logo />
        <nav className="ml-6 flex gap-1">
          <NavLink to="/" end className={link}>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Dashboard
          </NavLink>
          <NavLink to="/chat" className={link}>
            <MessageSquare className="h-4 w-4" aria-hidden="true" /> Assistant
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold uppercase text-teal-700 sm:flex"
            title={email}
          >
            {email.charAt(0)}
          </span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
