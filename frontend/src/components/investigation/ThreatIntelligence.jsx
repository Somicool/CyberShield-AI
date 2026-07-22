import { Radar, Globe, Server, Lock, MapPin, Loader2 } from 'lucide-react'

const NA = 'Not Available'

function fmtDate(iso) {
  if (!iso) return NA
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? NA : d.toLocaleDateString()
}

function Row({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-sm">
      <span className="text-slate-500">{k}</span>
      <span className="max-w-[60%] wrap-break-word text-right text-slate-200">{v}</span>
    </div>
  )
}

function IntelCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <Icon size={14} className="text-sky-400" />
        {title}
      </div>
      {children}
    </div>
  )
}

/**
 * Section 5 — Threat Intelligence (WHOIS / DNS / SSL / Hosting), rendered
 * from investigation_data.investigation. If investigation hasn't run yet,
 * shows a prominent Run Investigation action (URL incidents only).
 */
export default function ThreatIntelligence({ incident, canInvestigate, investigating, onRun }) {
  const investigation = incident?.investigation_data?.investigation

  if (!investigation) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Radar size={28} className="text-slate-600" />
        <p className="text-sm text-slate-400">
          Threat intelligence has not been collected for this case yet.
        </p>
        {canInvestigate ? (
          <button
            onClick={onRun}
            disabled={investigating}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
          >
            {investigating ? <Loader2 size={15} className="animate-spin" /> : <Radar size={15} />}
            Run Investigation
          </button>
        ) : (
          <p className="text-xs text-slate-600">
            Automated WHOIS / DNS / SSL investigation is available for URL-based cases only.
          </p>
        )}
      </div>
    )
  }

  const { whois, dns, ssl, geolocation } = investigation

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <IntelCard icon={Globe} title="WHOIS">
        <Row k="Registrar" v={whois?.registrar || NA} />
        <Row k="Domain Age" v={whois?.domain_age_days != null ? `${whois.domain_age_days} days` : NA} />
        <Row k="Creation Date" v={fmtDate(whois?.creation_date)} />
        <Row k="Expiration" v={fmtDate(whois?.expiration_date)} />
      </IntelCard>

      <IntelCard icon={Server} title="DNS">
        <Row k="A Records" v={dns?.a_records?.join(', ') || 'None'} />
        <Row k="MX Records" v={dns?.mx_records?.length ? dns.mx_records.join(', ') : 'None'} />
        <Row k="Name Servers" v={dns?.nameservers?.length ? dns.nameservers.join(', ') : 'None'} />
      </IntelCard>

      <IntelCard icon={Lock} title="SSL Certificate">
        {ssl?.success ? (
          <>
            <Row k="Issuer" v={ssl.issuer || NA} />
            <Row k="Validity" v={`${fmtDate(ssl.valid_from)} → ${fmtDate(ssl.valid_until)}`} />
            <Row
              k="Expiry"
              v={ssl.is_expired ? 'Expired' : `${ssl.days_until_expiry} days remaining`}
            />
          </>
        ) : (
          <p className="text-sm text-slate-500">Could not establish a secure connection to verify the certificate.</p>
        )}
      </IntelCard>

      <IntelCard icon={MapPin} title="Hosting">
        {geolocation ? (
          <>
            <Row k="IP Address" v={dns?.a_records?.[0] || NA} />
            <Row k="Country" v={geolocation.country || NA} />
            <Row k="City" v={geolocation.city || NA} />
            {/* GeoIP backend (ip-api free tier) does not return ISP. */}
            <Row k="ISP" v={NA} />
          </>
        ) : (
          <>
            <Row k="IP Address" v={dns?.a_records?.[0] || NA} />
            <Row k="Country" v={NA} />
            <Row k="City" v={NA} />
            <Row k="ISP" v={NA} />
          </>
        )}
      </IntelCard>
    </div>
  )
}
