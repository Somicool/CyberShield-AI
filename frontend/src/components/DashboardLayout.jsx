import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  ShieldAlert, Activity, FolderKanban, ScanSearch, BarChart3, Share2, Bot, Scale, Map, Settings,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: ShieldAlert },
  { to: '/dashboard/feed', label: 'Live Feed', icon: Activity },
  { to: '/dashboard/cases', label: 'Cases', icon: FolderKanban },
  { to: '/dashboard/check', label: 'Check Threat', icon: ScanSearch },
  { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/dashboard/graph', label: 'Threat Graph', icon: Share2 },
  { to: '/dashboard/copilot', label: 'AI Copilot', icon: Bot },
  { to: '/dashboard/map', label: 'Heatmap', icon: Map },
]

// Shown to police officers and administrators (JWT role). CrimeGPT is the
// police-only legal-intelligence workspace; the officer picks a case inside it.
const CRIMEGPT_NAV_ITEM = { to: '/dashboard/crimegpt', label: 'CrimeGPT', icon: Scale }

// Shown only to administrators (JWT role === 'admin').
const ADMIN_NAV_ITEM = { to: '/dashboard/admin', label: 'Administration', icon: Settings }

export default function DashboardLayout() {
  const { logout, role } = useAuth()
  const navItems = [
    ...NAV_ITEMS,
    ...(role === 'police' || role === 'admin' ? [CRIMEGPT_NAV_ITEM] : []),
    ...(role === 'admin' ? [ADMIN_NAV_ITEM] : []),
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <aside className="w-60 border-r border-slate-800 flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <Link to="/dashboard" className="text-lg font-semibold hover:text-purple-300">
            CyberShield AI
          </Link>
          <p className="text-xs text-slate-500">Smart Policing Dashboard</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded text-sm transition ${
                    isActive
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-700/50'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={logout}
            className="w-full text-sm bg-slate-900 hover:bg-slate-800 px-3 py-2 rounded text-slate-300"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
