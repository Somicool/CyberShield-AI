import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileWarning, Link2, Mail, MessageSquare, QrCode, DatabaseZap, Puzzle,
  ClipboardList, BookOpen, AlertTriangle, ChevronRight, ShieldCheck,
} from 'lucide-react'
import { getMe } from '../../api/auth'
import { listMyComplaints } from '../../api/complaints'
import { listIncidents } from '../../api/incidents'
import { SAFETY_TOPICS } from '../../lib/safetyContent'
import { StatusPill } from './CitizenComplaints'
import { verdictFor } from '../../lib/citizenThreat'

const QUICK_ACTIONS = [
  { label: 'Report Cyber Crime', icon: FileWarning, to: '/citizen/report', tone: 'border-red-500/40 bg-red-500/10 text-red-300' },
  { label: 'Check Suspicious Link', icon: Link2, to: '/citizen/check?tab=url', tone: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  { label: 'Check Suspicious Email', icon: Mail, to: '/citizen/check?tab=email', tone: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  { label: 'Check Suspicious SMS', icon: MessageSquare, to: '/citizen/check?tab=sms', tone: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  { label: 'Check QR Code', icon: QrCode, to: '/citizen/check?tab=qr', tone: 'border-sky-500/40 bg-sky-500/10 text-sky-300' },
  { label: 'Data Breach Check', icon: DatabaseZap, to: null, tone: 'border-slate-700 bg-slate-800/40 text-slate-400', soon: true },
  { label: 'CyberShield Guardian', icon: Puzzle, to: '/citizen/guardian', tone: 'border-purple-500/40 bg-purple-500/10 text-purple-300' },
]

const TYPE_LABEL = { url: 'Suspicious website', email: 'Phishing email', sms: 'Scam SMS', qr: 'Malicious QR code' }

function firstName(me) {
  if (!me?.full_name) return null
  return me.full_name.trim().split(/\s+/)[0]
}

export default function CitizenHome() {
  const [me, setMe] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    getMe().then(setMe).catch(() => {})
    listMyComplaints().then((c) => setComplaints(c.slice(0, 3))).catch(() => {})
    listIncidents({ page: 1, pageSize: 30 })
      .then((d) => {
        const items = (d.items || []).filter((i) => i.threat_level === 'high' || i.threat_level === 'critical').slice(0, 4)
        setAlerts(items)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8">
      {/* Welcome */}
      <div className="mb-6 rounded-2xl border border-slate-800 bg-linear-to-br from-sky-600/15 to-slate-900/10 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck size={28} className="text-sky-400" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Hello{firstName(me) ? `, ${firstName(me)}` : ''}
            </h1>
            <p className="text-sm text-slate-400">Welcome to CyberShield. How can we help you stay safe today?</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Quick Actions</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map(({ label, icon: Icon, to, tone, soon }) => {
          const inner = (
            <div className={`flex h-full flex-col items-start gap-3 rounded-2xl border p-4 transition ${tone} ${to ? 'hover:brightness-125' : 'cursor-default'}`}>
              <Icon size={24} />
              <span className="text-sm font-medium leading-snug text-slate-100">{label}</span>
              {soon && <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-400">Coming soon</span>}
            </div>
          )
          return to ? <Link key={label} to={to}>{inner}</Link> : <div key={label}>{inner}</div>
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent reports */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Recent Reports</h2>
            <Link to="/citizen/complaints" className="text-xs text-sky-400 hover:underline">View all</Link>
          </div>
          {complaints.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-center text-sm text-slate-500">
              <ClipboardList size={24} className="mx-auto mb-2 text-slate-700" />
              You have not filed any reports yet.
            </div>
          ) : (
            <div className="space-y-2">
              {complaints.map((c) => (
                <Link key={c.id} to={`/citizen/complaints/${c.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3 hover:border-sky-500/40">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-sky-300">{c.reference}</span>
                      <StatusPill status={c.status} />
                    </div>
                    <div className="mt-0.5 truncate text-sm text-slate-300">{c.category}</div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-600" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Latest threat alerts */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Latest Threat Alerts</h2>
          {alerts.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-center text-sm text-slate-500">
              No recent high-risk alerts.
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((a) => {
                const verdict = verdictFor(a.threat_level)
                return (
                  <div key={a.id} className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-400" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200">{TYPE_LABEL[a.incident_type] || 'Cyber threat'}</div>
                      <div className="truncate text-xs text-slate-500">{a.raw_content}</div>
                      <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px] font-medium ${verdict.tone}`}>{verdict.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Cyber safety tips */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Cyber Safety Tips</h2>
          <Link to="/citizen/safety" className="text-xs text-sky-400 hover:underline">See all</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {SAFETY_TOPICS.slice(0, 3).map((t) => (
            <Link key={t.id} to="/citizen/safety" className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-emerald-500/40">
              <BookOpen size={20} className="text-emerald-300" />
              <div className="mt-2 text-sm font-semibold text-slate-100">{t.title}</div>
              <div className="mt-1 text-xs text-slate-500">{t.summary}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
