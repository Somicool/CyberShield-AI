import { STATUS_STYLES, statusLabel } from '../../lib/caseHelpers'

export default function CaseStatusBadge({ status = 'open' }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.open
  return (
    <span
      className={`inline-block rounded border px-2 py-0.5 text-[12.5px] font-medium uppercase tracking-wide ${style}`}
    >
      {statusLabel(status)}
    </span>
  )
}
