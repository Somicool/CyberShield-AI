import { useNavigate } from 'react-router-dom'
import { Panel, PanelHead, PanelLink, SeverityDot, EmptyLine } from './Panel'
import { deriveCaseId, statusLabel } from '../../lib/caseHelpers'
import { relativeTime } from '../../lib/intel'

const TYPE_LABEL = { url: 'URL', sms: 'SMS', email: 'Email', qr: 'QR' }

/** Risk-score colour — only genuinely critical values turn red. */
function riskTextClass(level) {
  if (level === 'critical') return 'text-red-300'
  if (level === 'high') return 'text-amber-300'
  return 'text-zinc-300'
}

/**
 * The most important section on the dashboard: the top 5 highest-priority
 * unresolved cases. Deliberately a summary — the full, filterable case table
 * lives on the Cases page.
 */
export default function PriorityNow({ cases = [] }) {
  const navigate = useNavigate()

  return (
    <Panel className="flex h-full flex-col">
      <PanelHead
        title="Priority Now"
        hint={cases.length ? `${cases.length} open` : undefined}
        action={<PanelLink to="/dashboard/cases">View All Cases</PanelLink>}
      />

      {cases.length === 0 ? (
        <EmptyLine>No high or critical cases require attention.</EmptyLine>
      ) : (
        <div className="divide-y divide-white/5">
          {/* column labels */}
          <div className="grid grid-cols-[1fr_54px_44px_84px_60px] gap-2 px-4 py-1.5 text-[11.5px] uppercase tracking-[0.08em] text-zinc-600">
            <span>Case</span>
            <span>Type</span>
            <span className="text-right">Risk</span>
            <span>Status</span>
            <span className="text-right">Detected</span>
          </div>

          {cases.slice(0, 5).map(({ incident, meta }) => (
            <button
              key={incident.id}
              onClick={() => navigate(`/dashboard/investigate/${incident.id}`)}
              className="grid w-full grid-cols-[1fr_54px_44px_84px_60px] items-center gap-2 px-4 py-2.5 text-left transition hover:bg-white/3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <SeverityDot level={incident.threat_level} />
                <span className="truncate font-mono text-[13.5px] text-zinc-200">
                  {deriveCaseId(incident)}
                </span>
              </span>
              <span className="text-[13.5px] text-zinc-400">
                {TYPE_LABEL[incident.incident_type] || incident.incident_type}
              </span>
              <span className={`text-right font-mono text-[14px] tabular-nums ${riskTextClass(incident.threat_level)}`}>
                {incident.risk_score?.toFixed(0) ?? '—'}
              </span>
              <span className="truncate text-[13px] text-zinc-400">{statusLabel(meta.status)}</span>
              <span className="text-right text-[12.5px] text-zinc-500">
                {relativeTime(incident.created_at)}
              </span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  )
}
