import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getIncident, investigateIncident } from '../api/incidents'
import ThreatBadge from '../components/ThreatBadge'

export default function IncidentDetail() {
  const { id } = useParams()
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [investigating, setInvestigating] = useState(false)
  const [error, setError] = useState('')

  const fetchIncident = useCallback(async () => {
    try {
      const data = await getIncident(id)
      setIncident(data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchIncident()
  }, [fetchIncident])

  async function handleInvestigate() {
    setInvestigating(true)
    setError('')
    try {
      await investigateIncident(id)
      await fetchIncident()
    } catch (err) {
      setError(err.response?.data?.detail || 'Investigation failed')
    } finally {
      setInvestigating(false)
    }
  }

  if (loading) return <div className="p-8 text-slate-500">Loading...</div>
  if (!incident) return <div className="p-8 text-slate-500">Incident not found.</div>

  const investigation = incident.investigation_data?.investigation
  const heuristics = incident.investigation_data?.heuristics_triggered || []
  const embeddedUrls = incident.investigation_data?.embedded_urls || []

  return (
    <div className="p-8 max-w-4xl">
      <Link to="/dashboard" className="text-sm text-purple-400 hover:underline">
        &larr; Back to feed
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="uppercase text-xs text-slate-500">{incident.incident_type}</span>
            <ThreatBadge level={incident.threat_level} />
            <span className="font-mono text-sm text-slate-400">{incident.risk_score?.toFixed(1)}/100</span>
          </div>
          <p className="text-lg break-all">{incident.raw_content}</p>
        </div>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">AI Explanation</h3>
        <p className="text-slate-300 leading-relaxed">{incident.ai_explanation}</p>
      </section>

      {heuristics.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Warning Signs Detected</h3>
          <ul className="space-y-2">
            {heuristics.map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-red-400 font-mono text-xs mt-0.5">+{h.points}</span>
                <span className="text-slate-300">{h.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {embeddedUrls.length > 0 && (
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Embedded Links Found</h3>
          <ul className="space-y-1">
            {embeddedUrls.map((u, i) => (
              <li key={i} className="text-sm flex justify-between font-mono text-slate-400">
                <span className="truncate">{u.url}</span>
                <span className="ml-3 text-slate-500">{u.risk_score}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {incident.incident_type === 'url' && (
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-300">Domain Investigation</h3>
            <button
              onClick={handleInvestigate}
              disabled={investigating}
              className="text-xs bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-3 py-1.5 rounded"
            >
              {investigating ? 'Investigating...' : investigation ? 'Re-run Investigation' : 'Run Investigation'}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          {investigation ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">WHOIS</p>
                <p className="text-slate-300">
                  Registrar: {investigation.whois.registrar || 'Unknown'}
                  <br />
                  Domain age: {investigation.whois.domain_age_days ?? 'Unknown'} days
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">SSL Certificate</p>
                <p className="text-slate-300">
                  {investigation.ssl.success ? (
                    <>
                      Issuer: {investigation.ssl.issuer}
                      <br />
                      Expires in {investigation.ssl.days_until_expiry} days
                    </>
                  ) : (
                    'Could not verify'
                  )}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">DNS</p>
                <p className="text-slate-300">
                  Has MX records: {investigation.dns.has_mx ? 'Yes' : 'No'}
                  <br />
                  A records: {investigation.dns.a_records.join(', ') || 'None'}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Red Flags</p>
                {investigation.red_flags.length > 0 ? (
                  <ul className="text-red-400 text-sm list-disc list-inside">
                    {investigation.red_flags.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-emerald-400">None found</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No investigation run yet.</p>
          )}
        </section>
      )}
    </div>
  )
}
