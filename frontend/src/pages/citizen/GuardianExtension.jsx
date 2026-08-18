import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Puzzle, ShieldCheck, ShieldOff, Download, BookOpen, Flag,
  Globe, Ban, Clock, Power, CheckCircle2, XCircle,
} from 'lucide-react'

/**
 * CyberAid Guardian — Citizen Dashboard integration page (Feature 8).
 *
 * Detects whether the browser extension is installed via the marker its
 * content script writes onto this page (data-guardian-info + a window
 * message), and shows real protection stats reported by the extension. If the
 * extension isn't detected, it says so honestly and offers the download.
 */
function StatCard({ icon: Icon, label, value, accent = 'sky' }) {
  const accents = {
    sky: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/25',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-300 bg-red-500/10 border-red-500/20',
    slate: 'text-slate-400 bg-white/5 border-white/10',
  }
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-md">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border ${accents[accent]}`}>
        <Icon size={18} />
      </span>
      <div className="mt-3 text-[19px] font-semibold tabular-nums text-slate-100">{value}</div>
      <div className="text-[12px] uppercase tracking-[0.08em] text-slate-500">{label}</div>
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
    <div className="min-h-full"><div className="mx-auto flex max-w-4xl flex-col gap-3 p-6 sm:p-8">
      {/* Hero */}
      <div className="rounded-2xl border border-white/10 bg-linear-to-br from-cyan-500/12 via-slate-900/45 to-slate-900/25 p-6 backdrop-blur-md sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
            <Puzzle size={28} />
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">CyberAid Guardian</h1>
            <p className="text-[14px] text-slate-300">Your personal cyber bodyguard for the browser — protection that works while you browse.</p>
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/75 px-3 py-1 text-xs text-slate-400">
              Checking…
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href="/cybershield-guardian.zip"
            download
            className="btn-primary px-4 py-2.5 text-[13.5px]"
          >
            <Download size={16} /> Download Extension
          </a>
          <Link
            to="/citizen/guardian/guide"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-[13.5px] text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            <BookOpen size={16} /> Open Extension Guide
          </Link>
          <Link
            to="/citizen/report"
            className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-[13.5px] text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            <Flag size={16} /> Report Issue
          </Link>
        </div>
      </div>

      {/* Not-installed notice */}
      {checked && !installed && (
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/80 p-4 backdrop-blur-md">
          <ShieldOff size={22} className="mt-0.5 shrink-0 text-slate-500" />
          <div>
            <p className="text-sm font-medium text-slate-200">CyberAid Guardian is not installed.</p>
            <p className="mt-1 text-sm text-slate-400">
              Download it above and follow the{' '}
              <Link to="/citizen/guardian/guide" className="text-cyan-300 hover:underline">installation guide</Link>{' '}
              to protect yourself while browsing. Once installed, your protection status and stats will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Live status (only meaningful when installed) */}
      <h2 className="mt-2 text-[13.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">Protection Status</h2>
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

      <p className="text-[12.5px] text-slate-500">
        Stats are reported directly by the extension on this device. Your browsing history stays local and is never uploaded.
      </p>
      </div>
    </div>
  )
}
