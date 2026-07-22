import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts'
import { getStats } from '../api/incidents'

const THREAT_COLORS = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#facc15',
  low: '#34d399',
}

const TYPE_COLORS = ['#a855f7', '#60a5fa', '#f472b6', '#fbbf24']

export default function Analytics() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getStats(14).then(setStats)
  }, [])

  if (!stats) return <div className="p-8 text-slate-500">Loading...</div>

  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold mb-1">Threat Analytics</h2>
      <p className="text-sm text-slate-500 mb-6">
        {stats.total_incidents} total incidents · average risk score {stats.average_risk_score}
      </p>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Incidents by Threat Level</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.by_threat_level}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="threat_level" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.by_threat_level.map((entry, i) => (
                  <Cell key={i} fill={THREAT_COLORS[entry.threat_level] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Incidents by Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={stats.by_type}
                dataKey="count"
                nameKey="incident_type"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => entry.incident_type}
              >
                {stats.by_type.map((_, i) => (
                  <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Daily Trend (last 14 days)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.daily_counts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
            <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
            <Line type="monotone" dataKey="count" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
