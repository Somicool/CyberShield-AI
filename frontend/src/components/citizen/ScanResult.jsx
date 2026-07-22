import { Link } from 'react-router-dom'
import { ShieldAlert, CheckCircle2, Info, FileWarning } from 'lucide-react'
import { verdictFor, confidenceFor, adviceFor } from '../../lib/citizenThreat'

/**
 * Friendly, non-technical result card for a citizen scan. Renders the verdict,
 * risk score, confidence, the AI explanation and plain-language recommended
 * actions, plus a shortcut to report the item.
 */
export default function ScanResult({ result, reportCategory }) {
  if (!result) return null
  const verdict = verdictFor(result.threat_level)
  const confidence = confidenceFor(result.risk_score)
  const advice = adviceFor(result.threat_level)
  const Icon = verdict.key === 'safe' ? CheckCircle2 : verdict.key === 'suspicious' ? Info : ShieldAlert

  return (
    <div className="mt-6 space-y-4">
      {/* Verdict banner */}
      <div className={`flex items-center gap-4 rounded-2xl border p-5 ${verdict.tone}`}>
        <Icon size={36} className="shrink-0" />
        <div>
          <div className="text-xl font-semibold">{verdict.label}</div>
          <div className="text-sm opacity-90">{verdict.headline}</div>
        </div>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
          <div className="text-xs uppercase tracking-wide text-slate-500">Risk Score</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-slate-100">{Math.round(result.risk_score)}/100</div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-center">
          <div className="text-xs uppercase tracking-wide text-slate-500">Confidence</div>
          <div className="mt-1 font-mono text-2xl font-semibold text-slate-100">{confidence != null ? `${confidence}%` : '—'}</div>
        </div>
      </div>

      {/* AI explanation */}
      {result.explanation && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-1 text-sm font-semibold text-slate-200">What this means</div>
          <p className="text-sm leading-relaxed text-slate-300">{result.explanation}</p>
        </div>
      )}

      {/* Warning signs */}
      {result.heuristics_triggered?.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-200">Warning signs we spotted</div>
          <ul className="space-y-1">
            {result.heuristics_triggered.map((h, i) => (
              <li key={i} className="text-sm text-slate-400">• {h.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Advice */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-2 text-sm font-semibold text-slate-200">What you should do</div>
        <ul className="space-y-1.5">
          {advice.map((a, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${verdict.dot}`} />
              {a}
            </li>
          ))}
        </ul>
      </div>

      {(verdict.key === 'high' || verdict.key === 'suspicious') && (
        <Link
          to={`/citizen/report${reportCategory ? `?category=${encodeURIComponent(reportCategory)}` : ''}`}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-red-500"
        >
          <FileWarning size={16} /> Report this to CyberShield
        </Link>
      )}
    </div>
  )
}
