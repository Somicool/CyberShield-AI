import { useEffect, useState } from 'react'
import { User, Mail, BadgeCheck, LogOut, Loader2, ClipboardList } from 'lucide-react'
import { getMe } from '../../api/auth'
import { listMyComplaints } from '../../api/complaints'
import { useAuth } from '../../context/AuthContext'

/** Profile — the citizen's account details and a quick activity summary. */
export default function CitizenProfile() {
  const { logout } = useAuth()
  const [me, setMe] = useState(null)
  const [count, setCount] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getMe().catch(() => null), listMyComplaints().catch(() => [])])
      .then(([user, complaints]) => {
        setMe(user)
        setCount(complaints.length)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 text-sky-300">
          <User size={24} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-slate-100">My Profile</h1>
          <p className="text-sm text-slate-400">Your CyberShield account details.</p>
        </div>
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-400"><Loader2 size={16} className="animate-spin" /> Loading...</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center gap-3 border-b border-slate-800 py-3">
              <User size={16} className="text-slate-500" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Name</div>
                <div className="text-sm text-slate-200">{me?.full_name || 'Not provided'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-slate-800 py-3">
              <Mail size={16} className="text-slate-500" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Email</div>
                <div className="text-sm text-slate-200">{me?.email || '—'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3">
              <BadgeCheck size={16} className="text-slate-500" />
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Account type</div>
                <div className="text-sm capitalize text-slate-200">{me?.role || 'citizen'}</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <ClipboardList size={20} className="text-sky-300" />
            <div>
              <div className="text-sm text-slate-200">{count ?? 0} complaint{count === 1 ? '' : 's'} filed</div>
              <div className="text-xs text-slate-500">Thank you for helping keep the community safe.</div>
            </div>
          </div>

          <button onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800">
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  )
}
