import { useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import ThreatBadge from '../ThreatBadge'

const TYPE_LABEL = { url: 'URL / Link', sms: 'SMS', email: 'Email', qr: 'QR Code' }

function shortId(id) {
  return `#${String(id).slice(0, 8).toUpperCase()}`
}

/**
 * Section 3 — High Priority Cases.
 *
 * Compact triage table of the most recent HIGH and CRITICAL incidents.
 * The backend has no case-resolution workflow, so every listed case is
 * treated as OPEN (nothing can be marked resolved yet) — the status pill
 * reflects that truthfully rather than inventing states. Clicking a row
 * opens the existing Incident Detail page.
 */
export default function HighPriorityCases({ cases = [], limit = 6 }) {
  const navigate = useNavigate()
  const rows = cases.slice(0, limit)

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-orange-400" />
        <h3 className="text-sm font-semibold tracking-wide text-slate-200">High Priority Cases</h3>
        <span className="ml-1 text-xs text-slate-500">{cases.length} open</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Case ID</th>
              <th className="px-4 py-2.5 font-medium">Threat Type</th>
              <th className="px-4 py-2.5 font-medium">Risk</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Detected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  No high or critical cases open right now.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/dashboard/incidents/${c.id}`)}
                  className="cursor-pointer transition hover:bg-slate-900/70"
                >
                  <td className="px-4 py-3 font-mono text-xs text-purple-300">{shortId(c.id)}</td>
                  <td className="px-4 py-3 text-slate-300">{TYPE_LABEL[c.incident_type] || c.incident_type}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-slate-200">
                    {c.risk_score?.toFixed(0) ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <ThreatBadge level={c.threat_level} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{new Date(c.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
