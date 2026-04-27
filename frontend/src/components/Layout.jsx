import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { isLoggedIn } from '../utils/localSettings'

export default function Layout() {
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

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {loggedIn && <Sidebar />}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  )
}
