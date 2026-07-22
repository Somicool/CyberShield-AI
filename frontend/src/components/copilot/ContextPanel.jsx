import { Check, X, PanelRightClose } from 'lucide-react'
import ThreatBadge from '../ThreatBadge'
import { statusLabel } from '../../lib/caseHelpers'
import { SOURCE_LABELS } from '../../lib/copilotContext'

function Avail({ ok, label }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-emerald-400"><Check size={13} /> Available</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-slate-600"><X size={13} /> Not Available</span>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200">{children}</span>
    </div>
  )
}

/**
 * Section 3 — collapsible investigation context panel. Reflects the real data
 * currently loaded for the selected investigation and which backend sources
 * are available to the Copilot.
 */
export default function ContextPanel({ incident, caseId, meta, sources, relatedCount, linkedCount, onCollapse }) {
  const availKeys = ['gemini', 'whois', 'dns', 'ssl', 'geoip', 'graph']

  return (
    <aside className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-200">Investigation Context</h3>
        <button onClick={onCollapse} aria-label="Collapse panel" className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white">
          <PanelRightClose size={16} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {!incident ? (
          <p className="text-sm text-slate-500">No investigation selected. Choose one from the context selector to activate Investigation Mode.</p>
        ) : (
          <>
            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <Field label="Selected Investigation"><span className="font-mono text-xs text-purple-300">{caseId}</span></Field>
              <Field label="Threat Level"><ThreatBadge level={incident.threat_level} /></Field>
              <Field label="Risk Score"><span className="font-mono">{incident.risk_score?.toFixed(1) ?? '—'}/100</span></Field>
              <Field label="Current Status">{statusLabel(meta?.status || 'open')}</Field>
              <Field label="Threat Type">{incident.incident_type}</Field>
              <Field label="Related Cases">{relatedCount}</Field>
              <Field label="Linked Entities">{linkedCount}</Field>
            </div>

            <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-500">Available Sources</p>
              {availKeys.map((k) => (
                <Avail key={k} ok={sources[k]} label={SOURCE_LABELS[k]} />
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
