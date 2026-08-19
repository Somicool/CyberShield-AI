import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ShieldHalf, RefreshCw, Activity, Settings as SettingsIcon, FileDown,
  Users, ShieldCheck, UserCog, Server, Cpu, Database, Clock, X,
  Megaphone, ListChecks, Lock, HardDriveDownload,
} from 'lucide-react'
import { getAdminOverview, getAdminUsers, getSystemHealth, changeUserRole, changeUserStatus, resetUserPassword } from '../api/admin'
import { getStats } from '../api/incidents'
import KpiCard from '../components/dashboard/KpiCard'
import Section from '../components/investigation/Section'
import SystemHealthCenter from '../components/admin/SystemHealthCenter'
import AdminUserTable from '../components/admin/AdminUserTable'
import RoleMatrix from '../components/admin/RoleMatrix'
import PlannedGrid, { PlannedBadge } from '../components/admin/AdminPlanned'

function formatUptime(sec) {
  if (sec == null) return 'Not Available'
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function download(content, name, type) {
  const blob = new Blob([content], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

const FUTURE_MODULES = [
  'Multi-Factor Authentication', 'Active Directory Integration', 'LDAP', 'SSO',
  'SIEM Integration', 'Disaster Recovery', 'Automated Backup', 'High Availability Cluster',
]

/**
 * Administration & System Management — admin-only. All data comes from the
 * real /api/admin endpoints (users, counts, uptime, live health). Features
 * without backend support are clearly labelled "Planned Module" / "Not
 * Available" and never fabricated.
 */
export default function AdminSystem() {
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [healthLoading, setHealthLoading] = useState(true)
  const [error, setError] = useState('')
  const [resetResult, setResetResult] = useState(null)

  const healthRef = useRef(null)
  const settingsRef = useRef(null)
  const auditRef = useRef(null)

  const loadHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      setHealth(await getSystemHealth())
    } catch {
      setHealth(null)
    } finally {
      setHealthLoading(false)
    }
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [ov, us] = await Promise.all([getAdminOverview(), getAdminUsers()])
      setOverview(ov)
      setUsers(us)
    } catch {
      setError('Could not load administration data.')
    } finally {
      setLoading(false)
    }
    loadHealth()
  }, [loadHealth])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // ---- user actions -------------------------------------------------------
  const onChangeRole = async (user, role) => {
    if (role === user.role) return
    try {
      const updated = await changeUserRole(user.id, role)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (e) {
      window.alert(e.response?.data?.detail || 'Could not change role')
    }
  }

  const onToggleStatus = async (user) => {
    try {
      const updated = await changeUserStatus(user.id, !user.is_active)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (e) {
      window.alert(e.response?.data?.detail || 'Could not update account status')
    }
  }

  const onResetPassword = async (user) => {
    try {
      const res = await resetUserPassword(user.id)
      setResetResult({ email: user.email, password: res.temporary_password })
    } catch {
      window.alert('Could not reset password')
    }
  }

  // ---- exports (real data) ------------------------------------------------
  const exportUsers = () => {
    const header = ['Name', 'Email', 'Role', 'Status', 'Last Login', 'Created']
    const lines = users.map((u) => [
      u.full_name || '', u.email, u.role, u.is_active ? 'Active' : 'Disabled',
      u.last_login || '', u.created_at || '',
    ])
    const csv = [header, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    download(csv, `cyberaid-users-${Date.now()}.csv`, 'text/csv')
  }

  const exportStats = async () => {
    try {
      const stats = await getStats(30)
      download(JSON.stringify(stats, null, 2), `cyberaid-statistics-${Date.now()}.json`, 'application/json')
    } catch {
      window.alert('Could not export statistics')
    }
  }

  const serviceStatus = (name) => health?.services?.find((s) => s.name === name)?.status || 'unknown'
  const statusLabelFor = (s) => (s === 'healthy' ? 'Healthy' : s === 'unavailable' ? 'Unavailable' : 'Unknown')
  const statusAccent = (s) => (s === 'healthy' ? 'emerald' : s === 'unavailable' ? 'red' : 'slate')

  const kpis = [
    { icon: Users, label: 'Registered Citizens', value: overview?.citizens ?? '—', accent: 'sky' },
    { icon: ShieldCheck, label: 'Police Officers', value: overview?.police ?? '—', accent: 'purple' },
    { icon: UserCog, label: 'Administrators', value: overview?.admins ?? '—', accent: 'cyan' },
    { icon: Activity, label: 'Active Sessions', value: 'Not Available', accent: 'slate' },
    { icon: ListChecks, label: 'Total Investigations', value: overview?.total_investigations ?? '—', accent: 'purple' },
    { icon: Clock, label: 'System Uptime', value: formatUptime(overview?.uptime_seconds), accent: 'emerald' },
    { icon: Database, label: 'Database', value: statusLabelFor(serviceStatus('PostgreSQL')), accent: statusAccent(serviceStatus('PostgreSQL')) },
    { icon: Cpu, label: 'AI Service', value: statusLabelFor(serviceStatus('Gemini AI')), accent: statusAccent(serviceStatus('Gemini AI')) },
    { icon: Server, label: 'Backend', value: statusLabelFor(serviceStatus('FastAPI API')), accent: statusAccent(serviceStatus('FastAPI API')) },
  ]

  return (
    <div className="space-y-6 p-8">
      {/* Section 1 — header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-300">
            <ShieldHalf size={20} />
          </span>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Administration &amp; System Management</h2>
            <p className="text-sm text-slate-500">Manage CyberAid users, permissions, system configuration, and platform health.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadAll} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/75"><RefreshCw size={14} /> Refresh</button>
          <button onClick={() => healthRef.current?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/75"><Activity size={14} /> System Status</button>
          <button onClick={() => auditRef.current?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/75"><FileDown size={14} /> Export Logs</button>
          <button onClick={() => settingsRef.current?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800/75"><SettingsIcon size={14} /> Settings</button>
        </div>
      </header>

      {error && <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">{error}</div>}

      {/* Section 2 — overview KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* Section 5 / flagship — system health */}
      <div ref={healthRef}>
        <SystemHealthCenter health={health} loading={healthLoading} onRefresh={loadHealth} />
      </div>

      {/* Section 3 — user management */}
      <Section icon={Users} title="User Management">
        <AdminUserTable users={users} loading={loading} onChangeRole={onChangeRole} onToggleStatus={onToggleStatus} onResetPassword={onResetPassword} />
      </Section>

      {/* Section 4 — role management */}
      <Section icon={UserCog} title="Role Management">
        <RoleMatrix />
      </Section>

      {/* Section 6 — audit logs */}
      <div ref={auditRef}>
        <Section icon={ListChecks} title="Audit Logs">
          <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/75 px-4 py-4 text-sm text-slate-400">
            <ListChecks size={18} className="text-slate-500" />
            Audit Logging is a Planned Feature. User actions, role changes and settings updates will be recorded here once the audit backend is implemented.
          </div>
        </Section>
      </div>

      {/* Section 7 — platform settings */}
      <div ref={settingsRef}>
        <Section icon={SettingsIcon} title="Platform Settings">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SettingCard title="Authentication" rows={[['Password hashing', 'bcrypt'], ['Token expiry', `${health?.token_expiry_minutes ?? 'Not Available'} min`], ['JWT', 'Enabled']]} />
            <SettingCard title="AI Settings" rows={[['Provider', 'Google Gemini'], ['Status', statusLabelFor(serviceStatus('Gemini AI'))]]} planned />
            <SettingCard title="Investigation" rows={[['Detection pipeline', 'Active']]} planned />
            <SettingCard title="Notifications" rows={[]} planned />
            <SettingCard title="Analytics" rows={[['Trend window', '14 days']]} planned />
            <SettingCard title="Security" rows={[['CORS', 'Open (dev)'], ['Role-based access', 'Enforced']]} planned />
          </div>
        </Section>
      </div>

      {/* Section 8 — security center */}
      <Section icon={Lock} title="Security Center">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SecItem label="Failed Login Attempts" value="Not Available" />
          <SecItem label="Locked Accounts" value="Not Available" />
          <SecItem label="Expired Sessions" value="Not Available (stateless JWT)" />
          <SecItem label="Password Policy" value="bcrypt-hashed" />
          <SecItem label="Role Configuration" value="3 roles (citizen, police, admin)" />
          <SecItem label="JWT Authentication" value={`Enabled · ${health?.token_expiry_minutes ?? '—'} min expiry`} ok />
        </div>
      </Section>

      {/* Section 9 — backup & export */}
      <Section icon={HardDriveDownload} title="Backup & Export">
        <div className="flex flex-wrap gap-2">
          <button onClick={exportUsers} className="rounded-lg border border-slate-700 bg-slate-800/75 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">Export Users (CSV)</button>
          <button onClick={exportStats} className="rounded-lg border border-slate-700 bg-slate-800/75 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">Export Investigation Statistics</button>
          <button onClick={exportStats} className="rounded-lg border border-slate-700 bg-slate-800/75 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700">Export Analytics</button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-400">Download Reports</span> <PlannedBadge />
          <span className="ml-3 text-xs text-slate-400">Database Backup</span> <PlannedBadge />
        </div>
      </Section>

      {/* Section 10 — announcements */}
      <Section icon={Megaphone} title="System Announcements" defaultOpen={false}>
        <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/75 px-4 py-4 text-sm text-slate-400">
          <Megaphone size={18} className="text-slate-500" />
          Publishing maintenance, security and system notices requires an announcements backend. <PlannedBadge />
        </div>
      </Section>

      {/* Section 11 — future modules */}
      <Section icon={Server} title="Future Modules" defaultOpen={false}>
        <PlannedGrid items={FUTURE_MODULES} />
      </Section>

      {/* reset password result modal */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Temporary password">
          <div className="absolute inset-0 bg-black/60" onClick={() => setResetResult(null)} />
          <div className="relative w-full max-w-md rounded-xl border border-slate-800 bg-slate-950/95 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200">Temporary Password</h4>
              <button onClick={() => setResetResult(null)} className="rounded p-1 text-slate-400 hover:bg-slate-800/75 hover:text-white"><X size={16} /></button>
            </div>
            <p className="text-sm text-slate-400">A temporary password was set for <span className="text-slate-200">{resetResult.email}</span>. Share it securely — it is shown only once.</p>
            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 font-mono text-sm text-purple-300">{resetResult.password}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingCard({ title, rows, planned }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/72 p-4">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
        {planned && <PlannedBadge />}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">No editable settings yet.</p>
      ) : (
        <dl className="space-y-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between text-xs">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-slate-200">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {planned && <p className="mt-2 text-[12.5px] text-slate-600">Editing these settings is planned; values shown are current runtime configuration.</p>}
    </div>
  )
}

function SecItem({ label, value, ok }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/72 p-4">
      <div className="text-[12.5px] uppercase tracking-wide text-cyan-300/85">{label}</div>
      <div className={`mt-1 text-sm ${ok ? 'text-emerald-300' : 'text-slate-200'}`}>{value}</div>
    </div>
  )
}
