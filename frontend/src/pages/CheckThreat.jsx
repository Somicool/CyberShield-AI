import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScanSearch, Loader2, AlertCircle, Beaker } from 'lucide-react'
import { submitDetection } from '../api/detect'
import { listIncidents, investigateIncident } from '../api/incidents'
import { createComplaint } from '../api/complaints'
import { setStatus } from '../lib/caseWorkflow'
import ThreatTypeSelector from '../components/check/ThreatTypeSelector'
import AnalysisResult from '../components/check/AnalysisResult'
import RecentChecks from '../components/check/RecentChecks'

const RECENT_LIMIT = 5

// Sample inputs for demos. These only populate the form — they are never
// submitted automatically and no result is ever pre-filled.
const QUICK_TESTS = {
  url: {
    label: 'Suspicious URL',
    content: 'http://paypal-secure-login.verify-account.tk/signin?token=x',
  },
  email: {
    label: 'Phishing Email',
    sender: 'security-alert@sbi-verify-account.xyz',
    content:
      'Dear Customer,\n\nYour account has been temporarily suspended due to unusual activity. ' +
      'Verify your identity immediately at http://sbi-verify-account.xyz/login or your account ' +
      'will be permanently closed within 24 hours.\n\nSBI Security Team',
  },
  sms: {
    label: 'Scam SMS',
    content:
      'URGENT: Your bank account is blocked. Share the OTP sent to your phone and click bit.ly/xk92p to reactivate now.',
  },
}

const CATEGORY_BY_TYPE = {
  url: 'Suspicious Website',
  email: 'Phishing Email',
  sms: 'SMS Scam',
}

/**
 * Threat Analysis console.
 *
 * Reuses the existing detection API (/api/detect) and consumes its existing
 * response fields only. Post-detection actions reuse existing endpoints:
 * investigateIncident (WHOIS/DNS/SSL) and createComplaint (formal report).
 */
export default function CheckThreat() {
  const navigate = useNavigate()

  const [type, setType] = useState('url')
  const [content, setContent] = useState('')
  const [sender, setSender] = useState('')
  const [result, setResult] = useState(null)
  const [analyzedType, setAnalyzedType] = useState('url')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [recent, setRecent] = useState([])
  const [recentLoading, setRecentLoading] = useState(true)

  const [investigationBusy, setInvestigationBusy] = useState(false)
  const [investigationDone, setInvestigationDone] = useState(false)
  const [reportBusy, setReportBusy] = useState(false)
  const [reportReference, setReportReference] = useState('')
  const [actionError, setActionError] = useState('')

  const loadRecent = useCallback(async () => {
    try {
      const data = await listIncidents({ page: 1, pageSize: RECENT_LIMIT })
      setRecent(data.items || [])
    } catch {
      /* the panel shows an empty state on failure */
    } finally {
      setRecentLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecent()
  }, [loadRecent])

  function resetResultState() {
    setResult(null)
    setInvestigationDone(false)
    setReportReference('')
    setActionError('')
  }

  function switchType(next) {
    setType(next)
    setContent('')
    setSender('')
    setError('')
    resetResultState()
  }

  function loadExample() {
    const ex = QUICK_TESTS[type]
    setContent(ex.content)
    setSender(ex.sender || '')
    setError('')
    resetResultState()
  }

  /** The email sender line is genuinely part of the message, so include it. */
  function buildPayload() {
    const body = content.trim()
    if (type === 'email' && sender.trim()) return `From: ${sender.trim()}\n\n${body}`
    return body
  }

  async function handleAnalyze(e) {
    e.preventDefault()
    if (!content.trim() || loading) return
    setLoading(true)
    setError('')
    resetResultState()
    try {
      const data = await submitDetection({ type, content: buildPayload() })
      setResult(data)
      setAnalyzedType(type)
      loadRecent()
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ---- post-detection actions (existing APIs) -----------------------------
  function createInvestigation() {
    if (!result?.incident_id) return
    setStatus(result.incident_id, 'investigating')
    navigate(`/dashboard/investigate/${result.incident_id}`)
  }

  async function runInvestigation() {
    if (!result?.incident_id) return
    setInvestigationBusy(true)
    setActionError('')
    try {
      await investigateIncident(result.incident_id)
      setInvestigationDone(true)
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Investigation could not be completed.')
    } finally {
      setInvestigationBusy(false)
    }
  }

  async function reportThreat() {
    if (!result) return
    setReportBusy(true)
    setActionError('')
    try {
      const payload = {
        category: CATEGORY_BY_TYPE[analyzedType] || 'Suspicious Website',
        description: `Reported from the Threat Analysis console. Risk ${result.risk_score?.toFixed(0)}/100 (${result.threat_level}).\n\n${buildPayload().slice(0, 500)}`,
        ...(analyzedType === 'url' ? { url: content.trim() } : {}),
        ...(analyzedType === 'email' && sender.trim() ? { email: sender.trim() } : {}),
      }
      const created = await createComplaint(payload)
      setReportReference(created.reference)
    } catch (err) {
      setActionError(
        err.response?.status === 401
          ? 'Sign in to file a report.'
          : err.response?.data?.detail || 'Could not file the report.'
      )
    } finally {
      setReportBusy(false)
    }
  }

  function analyzeAnother() {
    setContent('')
    setSender('')
    resetResultState()
  }

  const isMessageMode = type !== 'url'

  return (
    <div className="min-h-full bg-[#16181c]">
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        {/* header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/25 bg-amber-400/10 text-amber-300">
              <ScanSearch size={18} />
            </span>
            <div>
              <h1 className="text-[19px] font-semibold tracking-tight text-zinc-50">Threat Analysis</h1>
              <p className="mt-0.5 text-[12.5px] text-zinc-500">
                Analyze suspicious URLs, emails, and messages using CyberShield AI.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Detection Engine Online
          </span>
        </header>

        {/* mode selector */}
        <ThreatTypeSelector value={type} onChange={switchType} disabled={loading} />

        {/* analysis workspace */}
        <section className="rounded-lg border border-white/7 bg-white/2">
          <form onSubmit={handleAnalyze} className="space-y-3 p-5">
            {type === 'email' && (
              <div>
                <label htmlFor="sender" className="block text-[11.5px] font-medium text-zinc-400">
                  Sender Email <span className="text-zinc-600">(optional)</span>
                </label>
                <input
                  id="sender"
                  type="text"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  placeholder="sender@example.com"
                  className="mt-1.5 w-full rounded-md border border-white/8 bg-black/25 px-3 py-2.5 text-[13px] text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label htmlFor="content" className="block text-[11.5px] font-medium text-zinc-400">
                {type === 'url' ? 'Suspicious URL' : type === 'email' ? 'Email Content' : 'Message Content'}
              </label>
              {type === 'url' ? (
                <input
                  id="content"
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste a URL to analyze..."
                  className="mt-1.5 w-full rounded-md border border-white/8 bg-black/25 px-3 py-2.5 font-mono text-[13px] text-zinc-100 placeholder:font-sans placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none"
                />
              ) : (
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={type === 'email' ? 7 : 5}
                  placeholder={
                    type === 'email'
                      ? 'Paste the full email content, including any links...'
                      : 'Paste the text message content...'
                  }
                  className="mt-1.5 w-full resize-y rounded-md border border-white/8 bg-black/25 px-3 py-2.5 text-[13px] leading-relaxed text-zinc-100 placeholder:text-zinc-600 focus:border-amber-400/40 focus:outline-none"
                />
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-amber-400/40 bg-amber-400/15 py-2.5 text-[13.5px] font-semibold text-amber-100 transition hover:bg-amber-400/25 disabled:opacity-45"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ScanSearch size={15} />}
              {loading ? 'Analyzing…' : 'Analyze Threat'}
            </button>
          </form>

          {/* quick test */}
          <div className="flex flex-wrap items-center gap-2 border-t border-white/5 px-5 py-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-zinc-600">
              <Beaker size={12} /> Quick Test
            </span>
            <button
              type="button"
              onClick={loadExample}
              disabled={loading}
              className="rounded-md border border-white/8 bg-white/3 px-2.5 py-1 text-[11.5px] text-zinc-300 transition hover:border-amber-400/30 hover:text-zinc-100 disabled:opacity-50"
            >
              {QUICK_TESTS[type].label}
            </button>
            <span className="text-[10.5px] text-zinc-600">fills the form only — nothing is submitted</span>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-4 py-3 text-[12.5px] text-red-300">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* result — appears in place, no navigation */}
        {result && (
          <AnalysisResult
            result={result}
            type={analyzedType}
            onCreateInvestigation={createInvestigation}
            onRunInvestigation={runInvestigation}
            onReportThreat={reportThreat}
            onAnalyzeAnother={analyzeAnother}
            investigationBusy={investigationBusy}
            investigationDone={investigationDone}
            reportBusy={reportBusy}
            reportReference={reportReference}
            actionError={actionError}
          />
        )}

        <RecentChecks items={recent} loading={recentLoading} />

        {isMessageMode && (
          <p className="text-[10.5px] text-zinc-600">
            Embedded links inside messages are scored automatically as part of the analysis.
          </p>
        )}
      </div>
    </div>
  )
}
