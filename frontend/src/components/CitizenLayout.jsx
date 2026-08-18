import { useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  Home, FileWarning, ShieldQuestion, ClipboardList,
  BookOpen, Puzzle, User, Menu, X, LogOut, ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Brand from './Brand'

const NAV = [
  { to: '/citizen', label: 'Home', icon: Home, end: true },
  { to: '/citizen/report', label: 'Report Cyber Crime', icon: FileWarning },
  { to: '/citizen/check', label: 'Check for Scams', icon: ShieldQuestion },
  { to: '/citizen/complaints', label: 'My Complaints', icon: ClipboardList },
  { to: '/citizen/safety', label: 'Cyber Safety', icon: BookOpen },
  { to: '/citizen/guardian', label: 'CyberAid Guardian', icon: Puzzle },
  { to: '/citizen/profile', label: 'Profile', icon: User },
]

/**
 * Citizen Portal layout — a simple, friendly, mobile-responsive shell. The
 * sidebar collapses into a top bar with a menu button on small screens. Kept
 * deliberately minimal so non-technical users are never overwhelmed.
 */
export default function CitizenLayout() {
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)

  const NavItems = ({ onNavigate }) => (
    <nav className="flex-1 space-y-1 p-3">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'border border-cyan-500/40 bg-cyan-500/12 text-cyan-200'
                : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="portal-citizen min-h-screen text-white">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link to="/citizen" className="flex items-center gap-2 font-semibold">
          <ShieldCheck size={20} className="text-cyan-400" /> <Brand />
        </Link>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg border border-slate-800 p-2 text-slate-300" aria-label="Menu">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-slate-900/55 backdrop-blur-md lg:sticky lg:top-0 lg:flex lg:h-screen">
          <div className="border-b border-white/8 p-5">
            <Link to="/citizen" className="flex items-center gap-2 text-lg font-semibold hover:text-cyan-200">
              <ShieldCheck size={22} className="text-cyan-400" /> <Brand />
            </Link>
            <p className="mt-1 text-xs text-slate-500">Citizen Safety Portal</p>
          </div>
          <NavItems />
          <div className="border-t border-white/8 p-3">
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white">
              <LogOut size={16} /> Log out
            </button>
          </div>
        </aside>

        {/* Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-white/10 bg-slate-900/92">
              <div className="flex items-center justify-between border-b border-white/8 p-4">
                <span className="flex items-center gap-2 font-semibold"><ShieldCheck size={20} className="text-cyan-400" /> <Brand /></span>
                <button onClick={() => setOpen(false)} aria-label="Close"><X size={18} className="text-slate-400" /></button>
              </div>
              <NavItems onNavigate={() => setOpen(false)} />
              <div className="border-t border-white/8 p-3">
                <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/4 px-3 py-2.5 text-sm text-slate-300 transition hover:border-white/20 hover:text-white">
                  <LogOut size={16} /> Log out
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="min-h-screen flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
