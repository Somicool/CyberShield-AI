import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Cell, Tooltip, ResponsiveContainer,
  PieChart, Pie,
} from 'recharts'
import { Panel, PanelHead, PanelLink } from '../dashboard/Panel'
import {
  SEVERITY_ORDER, SEVERITY_COLOR, TYPE_RAMP, TYPE_LABEL,
  CHART_AXIS, TOOLTIP_STYLE,
} from '../../lib/analytics'

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Section 3A — Threat Severity as a horizontal bar chart. Colour is semantic:
 * red = critical, amber = high, neutral = medium, green = low. Clicking a bar
 * drills through to the case list.
 */
function SeverityChart({ levels, onDrill }) {
  const data = SEVERITY_ORDER.map((lvl) => ({
    level: lvl,
    label: cap(lvl),
    count: levels.find((r) => r.threat_level === lvl)?.count || 0,
  }))
  const total = data.reduce((s, d) => s + d.count, 0)

  if (total === 0) {
    return <p className="px-4 py-10 text-center text-[14px] text-zinc-500">No severity data yet.</p>
  }

  return (
    <div className="px-2 py-3">
      <ResponsiveContainer width="100%" height={168}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 28, bottom: 0, left: 8 }} barCategoryGap={10}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={62}
            axisLine={false}
            tickLine={false}
            tick={{ fill: CHART_AXIS, fontSize: 11.5 }}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            formatter={(v) => [`${v} case${v === 1 ? '' : 's'}`, 'Count']}
          />
          <Bar dataKey="count" radius={[0, 3, 3, 0]} onClick={(d) => onDrill(d?.level)} cursor="pointer">
            {data.map((d) => (
              <Cell key={d.level} fill={SEVERITY_COLOR[d.level]} fillOpacity={d.count === 0 ? 0.15 : 0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* readable counts alongside the chart */}
      <div className="mt-1 grid grid-cols-4 gap-1 px-2">
        {data.map((d) => (
          <button
            key={d.level}
            onClick={() => onDrill(d.level)}
            className="rounded px-1 py-1 text-left transition hover:bg-white/4"
          >
            <span className="flex items-center gap-1.5 text-[12px] text-zinc-500">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: SEVERITY_COLOR[d.level] }} />
              {d.label}
            </span>
            <span className="mt-0.5 block font-mono text-[14px] tabular-nums text-zinc-300">
              {d.count}
              <span className="text-zinc-600"> · {total ? Math.round((d.count / total) * 100) : 0}%</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Section 3B — Threat Type as a compact donut, using one accent hue at varying
 * depth. Only types with real data are rendered.
 */
function TypeChart({ types, onDrill }) {
  const data = types
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .map((r, i) => ({
      type: r.incident_type,
      label: TYPE_LABEL[r.incident_type] || r.incident_type,
      count: r.count,
      color: TYPE_RAMP[i % TYPE_RAMP.length],
    }))
  const total = data.reduce((s, d) => s + d.count, 0)

  if (total === 0) {
    return <p className="px-4 py-10 text-center text-[14px] text-zinc-500">No threat-type data yet.</p>
  }

  return (
    <div className="flex items-center gap-2 px-3 py-3">
      <div className="relative h-42 w-42 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
              onClick={(d) => onDrill(d?.payload?.type)}
              cursor="pointer"
            >
              {data.map((d) => (
                <Cell key={d.type} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v} case${v === 1 ? '' : 's'}`, n]} />
          </PieChart>
        </ResponsiveContainer>
        {/* centre total */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[21px] font-semibold leading-none tabular-nums text-zinc-100">{total}</span>
          <span className="mt-0.5 text-[11px] uppercase tracking-wide text-zinc-600">cases</span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        {data.map((d) => (
          <button
            key={d.type}
            onClick={() => onDrill(d.type)}
            className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition hover:bg-white/4"
          >
            <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: d.color }} />
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-zinc-300">{d.label}</span>
            <span className="shrink-0 font-mono text-[13px] tabular-nums text-zinc-500">
              {d.count}
              <span className="text-zinc-600"> · {Math.round((d.count / total) * 100)}%</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function ThreatLandscape({ stats }) {
  const navigate = useNavigate()

  // Drill-down uses existing routes + the Live Feed's real filters.
  const drillSeverity = (level) => {
    if (!level) return
    navigate(`/dashboard/feed?level=${level}`)
  }
  const drillType = (type) => {
    if (!type) return
    navigate(`/dashboard/feed?type=${type}`)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel>
        <PanelHead
          title="Threat Severity"
          hint="by level"
          action={<PanelLink to="/dashboard/cases">Open Cases</PanelLink>}
        />
        <SeverityChart levels={stats?.by_threat_level || []} onDrill={drillSeverity} />
      </Panel>

      <Panel>
        <PanelHead
          title="Threat Type"
          hint="by vector"
          action={<PanelLink to="/dashboard/feed">Live Feed</PanelLink>}
        />
        <TypeChart types={stats?.by_type || []} onDrill={drillType} />
      </Panel>
    </div>
  )
}
