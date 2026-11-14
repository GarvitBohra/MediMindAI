import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/AuthContext.jsx'
import Navbar from './components/Navbar.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Chat from './pages/Chat.jsx'
import Reports from './pages/Reports.jsx'

function Protected({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <p className="p-8 text-center text-slate-500">Loading...</p>
  if (!session) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const { session } = useAuth()
  return (
    <div className="flex min-h-screen flex-col">
      {session && <Navbar />}
      <main className={session ? 'mx-auto w-full max-w-5xl flex-1 px-4 py-8' : 'flex-1'}>
        <Routes>
          <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/chat" element={<Protected><Chat /></Protected>} />
          <Route path="/reports" element={<Protected><Reports /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {session && (
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          MediMindAI is an educational project and does not provide medical advice. In an emergency, call your local emergency number.
        </footer>
      )}
    </div>
  )
}
