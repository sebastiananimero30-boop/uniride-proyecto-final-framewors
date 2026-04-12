import { useState, useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import { restoreSession, logoutUser } from './utils/auth'

export default function App() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Intentar restaurar sesión desde token guardado (solo con backend activo)
  useEffect(() => {
    restoreSession()
      .then((u) => { if (u) setUser(u) })
      .finally(() => setLoading(false))
  }, [])

  const handleLogin  = (userData) => setUser(userData)
  const handleLogout = async () => { await logoutUser(); setUser(null) }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <svg className="w-6 h-6 animate-spin text-[#1a3a5c]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    )
  }

  if (!user) return <LoginPage onLogin={handleLogin} />
  return <Dashboard user={user} onLogout={handleLogout} />
}
