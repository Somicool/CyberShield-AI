import {
  ShieldCheck, ShieldAlert, AlertTriangle, TriangleAlert,
  FolderPlus, Radar, Flag, RotateCcw, Loader2, Check,
} from 'lucide-react'

/**
 * The analysis verdict panel — the focal point of the console.
 *
 * Every value shown comes from the existing /api/detect response
 * (risk_score, threat_level, explanation, heuristics_triggered). Nothing is
 * invented; "Confidence" is a clearly-derived reading of how decisive the
 * score is, not a separate model output.
 */

const VERDICT = {
  low: {
    label: 'Safe',
    Icon: ShieldCheck,
    text: 'text-emerald-300',
    ring: 'border-emerald-500/30',
    wash: 'bg-emerald-500/6',
    bar: 'bg-emerald-400',
    chip: 'border-emerald-500/35 bg-emerald-500/12 text-emerald-300',
  },
  medium: {
    label: 'Suspicious',
    Icon: AlertTriangle,
    text: 'text-amber-300',
    ring: 'border-amber-500/30',
    wash: 'bg-amber-500/6',
    bar: 'bg-amber-400',
    chip: 'border-amber-500/35 bg-amber-500/12 text-amber-300',
  },
  high: {
    label: 'High Risk',
    Icon: ShieldAlert,
    text: 'text-red-300',
    ring: 'border-red-500/30',
    wash: 'bg-red-500/6',
    bar: 'bg-red-400',
    chip: 'border-red-500/35 bg-red-500/12 text-red-300',
  },
  critical: {
    label: 'Critical',
    Icon: TriangleAlert,
    text: 'text-red-400',
    ring: 'border-red-500/45',
    wash: 'bg-red-500/10',
    bar: 'bg-red-500',
    chip: 'border-red-500/45 bg-red-500/15 text-red-300',
  },
}

const TYPE_LABEL = { url: 'URL / Link', email: 'Email', sms: 'SMS / Message', qr: 'QR Code' }

/** How decisive the score is (distance from the neutral midpoint). */
function confidenceLabel(score) {
  if (score == null) return '—'
  const d = Math.abs(score - 50) / 50
  if (d >= 0.6) return 'High'
  if (d >= 0.3) return 'Medium'
  return 'Low'
}

function Metric({ label, value, valueClass = 'text-zinc-100', hint }) {
  return (
    <div className="px-4 py-3">
      <div className="text-[12px] uppercase tracking-[0.09em] text-cyan-300/85">{label}</div>
      <div className={`mt-1 text-[19px] font-semibold leading-none tabular-nums ${valueClass}`}>{value}</div>
      {hint && <div className="mt-1 text-[12px] text-zinc-600">{hint}</div>}
    </div>
  )
}

function ActionButton({ icon: Icon, label, onClick, busy, tone = 'default', done }) {
  const tones = {
    default: 'border-white/10 bg-white/4 text-zinc-200 hover:border-cyan-400/35 hover:bg-white/7',
    primary: 'border-cyan-400/40 bg-cyan-400/12 text-cyan-200 hover:bg-cyan-400/20',
  }
  return (
    <button
      onClick={onClick}
      disabled={busy || done}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[14px] font-medium transition disabled:opacity-60 ${tones[tone]}`}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : done ? <Check size={13} className="text-emerald-400" /> : <Icon size={13} />}
      {label}
    </button>
  )
}

export default function AnalysisResult({
  result,
  type,
  onCreateInvestigation,
  onRunInvestigation,
  onReportThreat,
  onAnalyzeAnother,
  investigationBusy,
  investigationDone,
  reportBusy,
  reportReference,
  actionError,
}) {
  const level = result.threat_level || 'low'
  const v = VERDICT[level] || VERDICT.low
  const score = result.risk_score ?? 0
  const isSafe = level === 'low'
  const signs = result.heuristics_triggered || []

  return (
    <div className={`overflow-hidden rounded-lg border ${v.ring} ${v.wash}`}>
      {/* verdict band */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border ${v.chip}`}>
            <v.Icon size={20} />
          </span>
          <div>
            <div className={`text-[19px] font-semibold uppercase tracking-[0.06em] ${v.text}`}>
              {v.label}
            </div>
            <div className="text-[13px] text-zinc-500">
              {isSafe ? 'No significant threat detected' : 'Review the findings below before acting'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`font-mono text-[28px] font-semibold leading-none tabular-nums ${v.text}`}>
            {score.toFixed(0)}
            <span className="text-[14.5px] text-zinc-500">/100</span>
          </div>
        </div>
      </div>

      {/* risk meter */}
      <div className="px-5">
        <div className="h-1 overflow-hidden rounded-full bg-white/8">
          <div className={`h-full rounded-full ${v.bar}`} style={{ width: `${Math.min(100, Math.max(2, score))}%` }} />
        </div>
      </div>

      {/* metrics */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-white/6 border-y border-white/6 bg-black/10">
        <Metric label="Risk Score" value={`${score.toFixed(0)}/100`} valueClass={v.text} />
        <Metric label="Confidence" value={confidenceLabel(score)} hint="verdict decisiveness" />
        <Metric label="Threat Type" value={TYPE_LABEL[type] || type} />
      </div>

      {/* AI explanation */}
      <div className="px-5 py-4">
        <h4 className="text-[12.5px] uppercase tracking-[0.09em] text-cyan-300/85">Why was this flagged?</h4>
        <p className="mt-2 text-[14.5px] leading-relaxed text-zinc-300">
          {result.explanation || 'No AI explanation is available for this check.'}
        </p>
      </div>

      {/* warning signs (existing heuristics only) */}
      {signs.length > 0 && (
        <div className="border-t border-white/6 px-5 py-4">
          <h4 className="text-[12.5px] uppercase tracking-[0.09em] text-cyan-300/85">
            Key Warning Signs <span className="text-zinc-600">({signs.length})</span>
          </h4>
          <ul className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
            {signs.map((h, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-md border border-white/6 bg-white/2 px-2.5 py-1.5 text-[13.5px] text-zinc-300"
              >
                <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-400/80" />
                <span className="flex-1">{h.reason}</span>
                <span className="shrink-0 font-mono text-[12px] text-zinc-600">+{h.points}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* actions */}
      <div className="border-t border-white/6 px-5 py-4">
        {isSafe ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[14.5px] text-emerald-300">
              <Check size={15} /> No significant threat detected
            </span>
            <ActionButton icon={RotateCcw} label="Analyze Another" onClick={onAnalyzeAnother} />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <ActionButton icon={FolderPlus} label="Create Investigation" onClick={onCreateInvestigation} tone="primary" />
              {type === 'url' && (
                <ActionButton
                  icon={Radar}
                  label={investigationDone ? 'Investigation Complete' : 'Run Investigation'}
                  onClick={onRunInvestigation}
                  busy={investigationBusy}
                  done={investigationDone}
                />
              )}
              <ActionButton
                icon={Flag}
                label={reportReference ? 'Threat Reported' : 'Report Threat'}
                onClick={onReportThreat}
                busy={reportBusy}
                done={Boolean(reportReference)}
              />
              <ActionButton icon={RotateCcw} label="Analyze Another" onClick={onAnalyzeAnother} />
            </div>

            {reportReference && (
              <p className="mt-2.5 text-[13px] text-emerald-300">
                Reported to CyberAid · reference <span className="font-mono">{reportReference}</span>
              </p>
            )}
            {investigationDone && (
              <p className="mt-2.5 text-[13px] text-zinc-500">
                WHOIS, DNS, SSL and hosting intelligence collected — open the investigation to review it.
              </p>
            )}
            {actionError && <p className="mt-2.5 text-[13px] text-red-300">{actionError}</p>}
          </>
        )}
      </div>
    </div>
  )
}
