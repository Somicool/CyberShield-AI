import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Puzzle, ShieldCheck, ShieldOff, Download, BookOpen, Flag,
  Globe, Ban, Clock, Power, CheckCircle2, XCircle,
} from 'lucide-react'

/**
 * CyberShield Guardian — Citizen Dashboard integration page (Feature 8).
 *
 * Detects whether the browser extension is installed via the marker its
 * content script writes onto this page (data-guardian-info + a window
 * message), and shows real protection stats reported by the extension. If the
 * extension isn't detected, it says so honestly and offers the download.
 */
function StatCard({ icon: Icon, label, value, accent = 'sky' }) {
  const accents = {
    sky: 'text-sky-300 bg-sky-500/10 border-sky-500/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-300 bg-red-500/10 border-red-500/20',
    slate: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
  }
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${accents[accent]}`}>
        <Icon size={18} />
      </span>
      <div className="mt-3 text-lg font-semibold text-slate-100">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}

export default function GuardianExtension() {
  const [info, setInfo] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const readAttr = () => {
      const attr = document.documentElement.getAttribute('data-guardian-info')
      if (attr) {
        try { setInfo(JSON.parse(attr)) } catch { /* ignore */ }
      }
    }
    const onMsg = (e) => {
      if (e.source === window && e.data?.source === 'cybershield-guardian' && e.data.installed) {
        setInfo(e.data)
      }
    }
    window.addEventListener('message', onMsg)
    // Ask the content script (if present) to (re)publish its status.
    window.postMessage({ source: 'cybershield-guardian-request' }, window.location.origin)
    readAttr()
    const t = setTimeout(() => { readAttr(); setChecked(true) }, 1200)
    return () => { window.removeEventListener('message', onMsg); clearTimeout(t) }
  }, [])

  const installed = Boolean(info?.installed)
  const stats = info?.stats || {}
  const protectionEnabled = info?.settings?.protectionEnabled

  const lastScan = stats.lastScan ? new Date(stats.lastScan).toLocaleString() : 'No scans yet'

  return (
    <div className="mx-auto max-w-4xl p-6 sm:p-8">
      {/* Hero */}
      <div className="rounded-2xl border border-sky-700/40 bg-linear-to-br from-sky-600/15 to-slate-900/10 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 text-sky-300">
            <Puzzle size={28} />
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-slate-100">CyberShield Guardian</h1>
            <p className="text-sm text-slate-400">Your personal cyber bodyguard for the browser — protection that works while you browse.</p>
          </div>
          {/* Extension status pill */}
          {checked || installed ? (
            installed ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <CheckCircle2 size={14} /> Installed{info?.version ? ` · v${info.version}` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
                <XCircle size={14} /> Not installed
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-400">
              Checking…
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href="/cybershield-guardian.zip"
            download
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-500"
          >
            <Download size={16} /> Download Extension
          </a>
          <Link
            to="/citizen/guardian/guide"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            <BookOpen size={16} /> Open Extension Guide
          </Link>
          <Link
            to="/citizen/report"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            <Flag size={16} /> Report Issue
          </Link>
        </div>
      </div>

      {/* Not-installed notice */}
      {checked && !installed && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
          <ShieldOff size={22} className="mt-0.5 shrink-0 text-slate-500" />
          <div>
            <p className="text-sm font-medium text-slate-200">CyberShield Guardian is not installed.</p>
            <p className="mt-1 text-sm text-slate-400">
              Download it above and follow the{' '}
              <Link to="/citizen/guardian/guide" className="text-sky-300 hover:underline">installation guide</Link>{' '}
              to protect yourself while browsing. Once installed, your protection status and stats will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Live status (only meaningful when installed) */}
      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Protection Status</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={installed ? ShieldCheck : ShieldOff}
          label="Extension Status"
          value={installed ? 'Active' : 'Inactive'}
          accent={installed ? 'emerald' : 'slate'}
        />
        <StatCard
          icon={Power}
          label="Protection"
          value={!installed ? '—' : protectionEnabled === false ? 'Disabled' : 'Enabled'}
          accent={installed && protectionEnabled !== false ? 'emerald' : 'slate'}
        />
        <StatCard icon={Clock} label="Last Scan" value={installed ? lastScan : '—'} accent="sky" />
        <StatCard icon={Globe} label="Protected Websites" value={installed ? (stats.protectedWebsites ?? 0) : '—'} accent="sky" />
        <StatCard icon={Ban} label="Threats Blocked" value={installed ? (stats.threatsBlocked ?? 0) : '—'} accent="red" />
      </div>

      <p className="mt-4 text-xs text-slate-600">
        Stats are reported directly by the extension on this device. Your browsing history stays local and is never uploaded.
      </p>
    </div>
  )
}
