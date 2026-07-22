import { Link } from 'react-router-dom'
import { useState } from 'react'
import {
  ArrowLeft, ShieldCheck, ScanLine, MousePointerClick, Flag, ListChecks,
  Download, Lock, ChevronDown,
} from 'lucide-react'

/**
 * CyberShield Guardian — Extension Guide (Feature 9). Explains what the
 * extension does, how to install it, permissions, privacy and FAQs. Static,
 * honest documentation — no fabricated capabilities.
 */
const WHAT_IT_DOES = [
  { icon: ScanLine, title: 'Real-time website checks', desc: 'Every site you open is checked against CyberShield AI. Dangerous pages trigger a full-screen warning before you continue.' },
  { icon: MousePointerClick, title: 'Right-click analysis', desc: 'Right-click any link and choose “Analyze with CyberShield AI” to check it before clicking.' },
  { icon: ShieldCheck, title: 'Popup dashboard', desc: 'See the current site’s risk score, prediction, confidence and an AI explanation from the toolbar.' },
  { icon: Flag, title: 'One-click reporting', desc: 'Report a scam site to CyberShield straight from the popup — it reuses your citizen login.' },
]

const STEPS = [
  'Click “Download Extension” on the Guardian page and unzip the downloaded file.',
  'Open your browser’s extensions page: chrome://extensions or edge://extensions.',
  'Turn on “Developer mode” (top-right toggle).',
  'Click “Load unpacked” and select the unzipped browser-extension folder.',
  'Pin CyberShield Guardian to your toolbar.',
  'Sign in to the CyberShield citizen portal once so the extension can report on your behalf.',
]

const PERMISSIONS = [
  ['Tabs / active tab', 'To read the address of the site you are on so it can be checked.'],
  ['Context menus', 'To add the “Analyze with CyberShield AI” right-click option.'],
  ['Storage', 'To keep your settings and local check history on your device.'],
  ['Notifications', 'To alert you when a dangerous site is detected.'],
  ['Website access', 'To display the warning overlay on a dangerous page.'],
]

const FAQ = [
  ['Does the extension run its own AI?', 'No. It never contains any detection model. Every check calls the existing CyberShield AI backend.'],
  ['Do you store my browsing history?', 'No. Your check history is stored only on your device and can be cleared anytime from the popup.'],
  ['Do you store my password?', 'Never. Reporting reuses the secure login token from your active CyberShield web session.'],
  ['Which browsers are supported?', 'Chromium-based browsers: Chrome, Edge and Brave (Manifest V3).'],
  ['Why did a safe site get flagged?', 'Detection is probabilistic. You can choose “Continue Anyway”, and you can report false positives so the platform improves.'],
]

function Faq({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-4 py-3 text-left">
        <ChevronDown size={15} className={`text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="text-sm font-medium text-slate-200">{q}</span>
      </button>
      {open && <p className="border-t border-slate-800 px-4 py-3 text-sm text-slate-400">{a}</p>}
    </div>
  )
}

export default function GuardianGuide() {
  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <Link to="/citizen/guardian" className="mb-4 inline-flex items-center gap-1 text-sm text-sky-300 hover:underline">
        <ArrowLeft size={14} /> Back to Guardian
      </Link>

      <h1 className="text-2xl font-semibold text-slate-100">Extension Guide</h1>
      <p className="mt-1 text-sm text-slate-400">Everything you need to know about CyberShield Guardian.</p>

      {/* What it does */}
      <h2 className="mt-8 mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        <ShieldCheck size={15} className="text-sky-400" /> What it does
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {WHAT_IT_DOES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-300"><Icon size={20} /></span>
            <div>
              <div className="text-sm font-semibold text-slate-100">{title}</div>
              <div className="text-xs text-slate-400">{desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Installation */}
      <h2 className="mt-8 mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        <Download size={15} className="text-sky-400" /> Installation steps
      </h2>
      <ol className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        {STEPS.map((s, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-sky-500/40 bg-sky-500/10 text-xs font-semibold text-sky-300">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>

      {/* Permissions */}
      <h2 className="mt-8 mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        <ListChecks size={15} className="text-sky-400" /> Permissions required
      </h2>
      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-800">
            {PERMISSIONS.map(([name, why]) => (
              <tr key={name}>
                <td className="w-1/3 px-4 py-3 font-medium text-slate-200">{name}</td>
                <td className="px-4 py-3 text-slate-400">{why}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Privacy */}
      <h2 className="mt-8 mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        <Lock size={15} className="text-sky-400" /> Privacy policy
      </h2>
      <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-sm text-slate-400">
        <p>CyberShield Guardian is built around data minimisation:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>URLs are sent to the CyberShield backend only to be checked for scams.</li>
          <li>Your check history is stored locally on your device and never uploaded.</li>
          <li>No passwords are stored. Reporting reuses your active CyberShield session token.</li>
          <li>You can disable real-time protection or clear history at any time from the popup.</li>
        </ul>
      </div>

      {/* FAQ */}
      <h2 className="mt-8 mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Frequently asked questions</h2>
      <div className="space-y-2">
        {FAQ.map(([q, a]) => <Faq key={q} q={q} a={a} />)}
      </div>
    </div>
  )
}
