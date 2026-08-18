import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  ShieldAlert, Activity, FolderKanban, ScanSearch, BarChart3, Share2, Bot, Scale, Map, Settings,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Brand from './Brand'

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
    <div className="flex min-h-screen text-white">
      {/* Sticky so navigation stays in reach on long, data-dense pages. */}
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-white/10 bg-[#0b1119]/88 backdrop-blur-md">
        <div className="border-b border-white/8 p-5">
          <Link to="/dashboard" className="text-lg font-semibold transition hover:text-cyan-200">
            <Brand />
          </Link>
          <p className="text-xs text-slate-500">Smart Policing Dashboard</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/dashboard'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded px-3 py-2 text-sm transition ${
                    isActive
                      ? 'border border-cyan-500/40 bg-cyan-500/12 text-cyan-200'
                      : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-white/8 p-3">
          <button
            onClick={logout}
            className="w-full rounded border border-white/10 bg-white/4 px-3 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>
    </div>
  )
}
