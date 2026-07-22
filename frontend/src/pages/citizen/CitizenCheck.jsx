import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ShieldCheck, Link2, Mail, MessageSquare, QrCode } from 'lucide-react'
import ScanTool from '../../components/citizen/ScanTool'
import QrScanPanel from '../../components/citizen/QrScanPanel'

const TABS = [
  { id: 'url', label: 'Link', icon: Link2 },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'qr', label: 'QR Code', icon: QrCode },
]

const VALID = new Set(TABS.map((t) => t.id))

/**
 * Check for Scams — a single page with tabs for Link, Email, SMS and QR. Each
 * tab reuses the same detection backend (/api/detect) through the shared
 * ScanTool / QrScanPanel, so there is one place for citizens to check anything
 * suspicious.
 */
export default function CitizenCheck() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('tab')
  const [tab, setTab] = useState(VALID.has(initial) ? initial : 'url')

  // Keep the URL query in sync so tabs are shareable / deep-linkable.
  useEffect(() => {
    const current = params.get('tab')
    if (current !== tab) {
      const next = new URLSearchParams(params)
      next.set('tab', tab)
      setParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 text-sky-300">
          <ShieldCheck size={24} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Check for Scams</h1>
          <p className="text-sm text-slate-400">Check a link, email, SMS or QR code in one place.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 grid grid-cols-4 gap-1 rounded-xl border border-slate-800 bg-slate-900/50 p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition sm:text-sm ${
              tab === id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Panels — remount per tab so state resets cleanly */}
      {tab === 'url' && (
        <ScanTool
          key="url"
          embedded
          type="url"
          icon={Link2}
          subtitle="Paste a website link and we will tell you if it looks safe."
          placeholder="Paste the link here, e.g. http://your-bank-verify.com"
          buttonLabel="Check this link"
          reportCategory="Suspicious Website"
        />
      )}
      {tab === 'email' && (
        <ScanTool
          key="email"
          embedded
          type="email"
          icon={Mail}
          subtitle="Paste the email content to check it for scams."
          placeholder="Paste the full email text here, including any links..."
          multiline
          buttonLabel="Check this email"
          reportCategory="Phishing Email"
        />
      )}
      {tab === 'sms' && (
        <ScanTool
          key="sms"
          embedded
          type="sms"
          icon={MessageSquare}
          subtitle="Paste a text message to check whether it is a scam."
          placeholder="Paste the SMS text here, e.g. 'Your account is blocked, click...'"
          multiline
          buttonLabel="Check this message"
          reportCategory="SMS Scam"
        />
      )}
      {tab === 'qr' && <QrScanPanel key="qr" />}
    </div>
  )
}
