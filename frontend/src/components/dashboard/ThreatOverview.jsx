import { Panel, PanelHead, PanelLink } from './Panel'

const TYPE_LABEL = { url: 'URL', email: 'Email', sms: 'SMS', qr: 'QR' }
const TYPE_ORDER = ['url', 'email', 'sms', 'qr']
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low']

const SEVERITY_BAR = {
  critical: 'bg-red-400/70',
  high: 'bg-amber-400/70',
  medium: 'bg-zinc-500',
  low: 'bg-emerald-400/60',
}

function Bar({ label, count, total, barClass }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="grid grid-cols-[52px_1fr_46px] items-center gap-2.5">
      <span className="text-[13px] text-zinc-400">{label}</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-white/6">
        <span className={`block h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right text-[12.5px] tabular-nums text-zinc-500">
        {count}
        <span className="text-zinc-600"> · {pct}%</span>
      </span>
    </div>
  )
}

/**
 * Compact distribution of threats by type and by severity, from the existing
 * /incidents/stats payload. Small horizontal bars instead of large charts —
 * detailed charts remain on the Analytics page.
 */
export default function ThreatOverview({ stats }) {
  const byType = stats?.by_type || []
  const bySeverity = stats?.by_threat_level || []

  const typeTotal = byType.reduce((s, r) => s + r.count, 0)
  const sevTotal = bySeverity.reduce((s, r) => s + r.count, 0)

  const typeRows = TYPE_ORDER.map((t) => ({
    key: t,
    label: TYPE_LABEL[t],
    count: byType.find((r) => r.incident_type === t)?.count || 0,
  })).filter((r) => r.count > 0 || typeTotal === 0)

  const sevRows = SEVERITY_ORDER.map((s) => ({
    key: s,
    label: s[0].toUpperCase() + s.slice(1),
    count: bySeverity.find((r) => r.threat_level === s)?.count || 0,
  }))

  return (
    <Panel className="flex h-full flex-col">
      <PanelHead
        title="Threat Overview"
        hint={sevTotal ? `${sevTotal} total` : undefined}
        action={<PanelLink to="/dashboard/analytics">Analytics</PanelLink>}
      />
      <div className="grid gap-5 px-4 py-3.5 sm:grid-cols-2">
        <div>
          <div className="mb-2.5 text-[12px] uppercase tracking-[0.09em] text-zinc-600">By Type</div>
          <div className="space-y-2">
            {typeRows.length === 0 ? (
              <p className="text-[13.5px] text-zinc-500">No data yet.</p>
            ) : (
              typeRows.map((r) => (
                <Bar key={r.key} label={r.label} count={r.count} total={typeTotal} barClass="bg-amber-300/60" />
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-2.5 text-[12px] uppercase tracking-[0.09em] text-zinc-600">By Severity</div>
          <div className="space-y-2">
            {sevRows.map((r) => (
              <Bar key={r.key} label={r.label} count={r.count} total={sevTotal} barClass={SEVERITY_BAR[r.key]} />
            ))}
          </div>
        </div>
      </div>
    </Panel>
  )
}
