import { useNavigate } from 'react-router-dom'
import { Panel, PanelHead, PanelLink, SeverityDot, EmptyLine } from './Panel'

function hhmm(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '--:--'
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * A compact chronological strip of the latest 5 events (detections + officer
 * workflow changes). Events for cases already listed in Priority Now are
 * filtered out upstream so nothing appears twice on the dashboard.
 */
export default function RecentActivity({ events = [] }) {
  const navigate = useNavigate()

  return (
    <Panel className="flex h-full flex-col">
      <PanelHead title="Recent Activity" action={<PanelLink to="/dashboard/feed">View Live Feed</PanelLink>} />

      {events.length === 0 ? (
        <EmptyLine>No recent activity recorded.</EmptyLine>
      ) : (
        <div className="divide-y divide-white/5">
          {events.slice(0, 5).map((e) => (
            <button
              key={e.id}
              onClick={() => e.incidentId && navigate(`/dashboard/investigate/${e.incidentId}`)}
              disabled={!e.incidentId}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition enabled:hover:bg-white/3 disabled:cursor-default"
            >
              <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-zinc-500">{hhmm(e.at)}</span>
              <SeverityDot level={e.level} />
              <span className="min-w-0 flex-1 truncate text-[14px] text-zinc-300">{e.text}</span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  )
}
