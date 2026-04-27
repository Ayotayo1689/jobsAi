import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import ResumeAnalysis from './pages/ResumeAnalysis'
import JobDiscovery from './pages/JobDiscovery'
import Applications from './pages/Applications'
import WhatsApp from './pages/WhatsApp'
import Settings from './pages/Settings'
import { isLoggedIn } from './utils/localSettings'

function useAuthStatus() {
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn())

  useEffect(() => {
    const sync = () => setLoggedIn(isLoggedIn())
    window.addEventListener('storage', sync)
    window.addEventListener('jobsai:auth-changed', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('jobsai:auth-changed', sync)
    }
  }, [])

  return loggedIn
}

function Protected({ loggedIn, children }) {
  return loggedIn ? children : <Landing showLoginModal />
}

export default function App() {
  const loggedIn = useAuthStatus()

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={loggedIn ? <Dashboard /> : <Landing />} />
        <Route path="resume" element={<Protected loggedIn={loggedIn}><ResumeAnalysis /></Protected>} />
        <Route path="jobs" element={<Protected loggedIn={loggedIn}><JobDiscovery /></Protected>} />
        <Route path="applications" element={<Protected loggedIn={loggedIn}><Applications /></Protected>} />
        <Route path="whatsapp" element={<Protected loggedIn={loggedIn}><WhatsApp /></Protected>} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
