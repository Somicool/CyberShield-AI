import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { Panel, PanelHead, PanelLink } from '../dashboard/Panel'
import { CHART_AXIS, CHART_GRID, TOOLTIP_STYLE } from '../../lib/analytics'

const ACCENT = '#d4a72c'

/** Short date label, e.g. "22 Jul". */
function dayLabel(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString([], { day: '2-digit', month: 'short' })
}

/**
 * Section 4 — Threat Activity.
 *
 * With enough points this is an area chart; with only a handful of days it
 * renders as bars instead, so a sparse period is never stretched to look like
 * a rich dataset. The insight line appears only when the data supports it.
 */
export default function ThreatActivity({ dailyCounts = [], trend, days }) {
  const data = dailyCounts.map((d) => ({ ...d, label: dayLabel(d.date) }))
  const hasData = data.length > 0
  const sparse = data.length < 4 // too few points for a meaningful curve
  const totalInPeriod = data.reduce((s, d) => s + d.count, 0)

  const TrendIcon = trend?.dir === 'up' ? TrendingUp : trend?.dir === 'down' ? TrendingDown : Minus
  const trendClass =
    trend?.dir === 'up' ? 'text-amber-300' : trend?.dir === 'down' ? 'text-emerald-300' : 'text-zinc-400'

  const rangeLabel = hasData
    ? data.length === 1
      ? data[0].label
      : `${data[0].label} – ${data[data.length - 1].label}`
    : `last ${days} days`

  return (
    <Panel>
      <PanelHead
        title="Threat Activity"
        hint={rangeLabel}
        action={<PanelLink to="/dashboard/feed">Live Feed</PanelLink>}
      />

      {/* insight — only rendered when the series supports a direction */}
      {trend && (
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-2.5">
          <TrendIcon size={14} className={trendClass} />
          <span className="text-[12.5px] text-zinc-300">{trend.sentence}</span>
          <span className="ml-auto font-mono text-[11.5px] tabular-nums text-zinc-500">
            {totalInPeriod} in period
          </span>
        </div>
      )}

      {!hasData ? (
        <p className="px-4 py-12 text-center text-[12.5px] text-zinc-500">
          No incident activity recorded in this period.
        </p>
      ) : (
        <div className="px-2 py-3">
          <ResponsiveContainer width="100%" height={210}>
            {sparse ? (
              // Few data points → discrete bars, honestly showing limited data.
              <BarChart data={data} margin={{ top: 6, right: 16, bottom: 0, left: -14 }} barCategoryGap="45%">
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: CHART_AXIS, fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: CHART_AXIS, fontSize: 11 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  formatter={(v) => [`${v} incident${v === 1 ? '' : 's'}`, 'Volume']}
                />
                <Bar dataKey="count" fill={ACCENT} fillOpacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={54} />
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 6, right: 16, bottom: 0, left: -14 }}>
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_GRID} vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_AXIS, fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={24}
                />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: CHART_AXIS, fontSize: 11 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [`${v} incident${v === 1 ? '' : 's'}`, 'Volume']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={ACCENT}
                  strokeWidth={1.8}
                  fill="url(#activityFill)"
                  dot={data.length <= 12 ? { r: 2.5, fill: ACCENT, strokeWidth: 0 } : false}
                  activeDot={{ r: 4, fill: ACCENT, strokeWidth: 0 }}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>

          {sparse && (
            <p className="px-3 pb-1 text-[10.5px] text-zinc-600">
              Only {data.length} day{data.length === 1 ? '' : 's'} of activity in this period — shown as discrete
              values rather than a trend curve.
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
