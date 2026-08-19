import { useMemo, useState } from 'react'
import { Search, Eye, KeyRound, Ban, CheckCircle2, X } from 'lucide-react'
import { SkeletonRows } from '../cases/Skeleton'

const ROLES = ['citizen', 'police', 'admin']
const ROLE_LABEL = { citizen: 'Citizen', police: 'Police Officer', admin: 'Administrator' }

function fmt(d) {
  return d ? new Date(d).toLocaleString() : 'Not Available'
}

function ProfileModal({ user, onClose }) {
  if (!user) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="User profile">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-950/95 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-200">User Profile</h4>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-800/75 hover:text-white"><X size={16} /></button>
        </div>
        <dl className="space-y-2 text-sm">
          {[
            ['Name', user.full_name || 'Not Available'],
            ['Email', user.email],
            ['Role', ROLE_LABEL[user.role] || user.role],
            ['Status', user.is_active ? 'Active' : 'Disabled'],
            ['Last Login', fmt(user.last_login)],
            ['Account Created', fmt(user.created_at)],
            ['User ID', user.id],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-slate-500">{k}</dt>
              <dd className="max-w-[60%] break-all text-right text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

/**
 * Section 3 — User Management table. Real users from /api/admin/users with
 * client-side search + role filter. Role changes, enable/disable and password
 * reset call real admin endpoints. Last Login shows "Not Available" when never
 * recorded rather than fabricating a value.
 */
export default function AdminUserTable({ users = [], loading, onChangeRole, onToggleStatus, onResetPassword }) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [profile, setProfile] = useState(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      if (q && !(`${u.email} ${u.full_name || ''}`.toLowerCase().includes(q))) return false
      return true
    })
  }, [users, search, roleFilter])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            aria-label="Search users"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-sm focus:border-purple-600 focus:outline-none"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 focus:border-purple-600 focus:outline-none">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-cyan-300">
            <tr>
              <th className="text-cyan-300 px-4 py-3 font-medium">Name</th>
              <th className="text-cyan-300 px-4 py-3 font-medium">Email</th>
              <th className="text-cyan-300 px-4 py-3 font-medium">Role</th>
              <th className="text-cyan-300 px-4 py-3 font-medium">Status</th>
              <th className="text-cyan-300 px-4 py-3 font-medium">Last Login</th>
              <th className="text-cyan-300 px-4 py-3 font-medium">Created</th>
              <th className="text-cyan-300 px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <SkeletonRows rows={5} cols={7} />
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">No users match your search.</td></tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="hover:bg-slate-900/75">
                  <td className="px-4 py-3 text-slate-200">{u.full_name || <span className="text-slate-600">—</span>}</td>
                  <td className="px-4 py-3 text-slate-300">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => onChangeRole(u, e.target.value)}
                      className="rounded border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-200 focus:border-purple-600 focus:outline-none"
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="rounded border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[12.5px] font-medium uppercase text-emerald-300">Active</span>
                    ) : (
                      <span className="rounded border border-slate-500/40 bg-slate-500/15 px-2 py-0.5 text-[12.5px] font-medium uppercase text-slate-400">Disabled</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmt(u.last_login)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Not Available'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button title="View Profile" onClick={() => setProfile(u)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"><Eye size={15} /></button>
                      <button title="Reset Password" onClick={() => onResetPassword(u)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white"><KeyRound size={15} /></button>
                      {u.is_active ? (
                        <button title="Disable Account" onClick={() => onToggleStatus(u)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-red-300"><Ban size={15} /></button>
                      ) : (
                        <button title="Enable Account" onClick={() => onToggleStatus(u)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700 hover:text-emerald-300"><CheckCircle2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ProfileModal user={profile} onClose={() => setProfile(null)} />
    </div>
  )
}
