import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, FileText, Search, ClipboardList, Settings, Zap, MessageSquare, LogOut } from 'lucide-react'
import { clearLocalSettings } from '../utils/localSettings'

const links = [
  { to: '/',             icon: LayoutDashboard, label: 'Dashboard',    end: true },
  { to: '/resume',       icon: FileText,        label: 'Resume'               },
  { to: '/jobs',         icon: Search,          label: 'Discover'             },
  { to: '/applications', icon: ClipboardList,   label: 'Applications'         },
  { to: '/whatsapp',     icon: MessageSquare,   label: 'WhatsApp Bot'         },
  { to: '/settings',     icon: Settings,        label: 'Settings'             },
]

export default function Sidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    clearLocalSettings()
    navigate('/')
  }

  return (
    <aside className="w-52 shrink-0 flex flex-col h-full" style={{ backgroundColor: '#00455D' }}>

      {/* Wordmark */}
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-white/15 flex items-center justify-center shrink-0">
            <Zap size={13} className="text-white" fill="currentColor" />
          </div>
          <span className="font-semibold text-white text-sm tracking-tight">
            JobsAI
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 space-y-0.5">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors group ${
                isActive
                  ? 'text-accent bg-white/10'
                  : 'text-brand-muted hover:text-white hover:bg-white/8'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Left-edge cyan accent on active */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent rounded-r-full" />
                )}
                <Icon
                  size={15}
                  className={
                    isActive
                      ? 'text-accent shrink-0'
                      : 'text-brand-muted group-hover:text-white shrink-0 transition-colors'
                  }
                />
                <span className="truncate font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-3">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm text-brand-muted hover:text-white hover:bg-white/8 transition-colors"
        >
          <LogOut size={15} />
          <span className="font-medium">Logout</span>
        </button>
        
      </div>
    </aside>
  )
}
