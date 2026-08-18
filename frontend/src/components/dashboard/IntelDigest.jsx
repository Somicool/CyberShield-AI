import { Panel, PanelHead, PanelLink, SeverityDot, EmptyLine } from './Panel'
import { relativeTime } from '../../lib/intel'

const SEV_LABEL = {
  critical: 'text-red-300',
  high: 'text-amber-300',
  medium: 'text-zinc-400',
  low: 'text-emerald-400',
}

/**
 * The three most important AI intelligence findings (patterns, not individual
 * incidents — so nothing duplicates Priority Now or Recent Activity). The full
 * feed lives on the Live Feed page.
 */
export default function IntelDigest({ insights = [] }) {
  return (
    <Panel className="flex h-full flex-col">
      <PanelHead
        title="AI Intelligence"
        hint={insights.length > 3 ? `${insights.length} findings` : undefined}
        action={<PanelLink to="/dashboard/feed?view=intel">View Intelligence Feed</PanelLink>}
      />

      {insights.length === 0 ? (
        <EmptyLine>No coordinated patterns detected in recent activity.</EmptyLine>
      ) : (
        <div className="divide-y divide-white/5">
          {insights.slice(0, 3).map((ins) => (
            <div key={ins.id} className="px-4 py-2.5">
              <div className="flex items-center gap-2">
                <SeverityDot level={ins.severity} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-zinc-200">
                  {ins.title}
                </span>
                <span className={`shrink-0 text-[11.5px] uppercase tracking-wide ${SEV_LABEL[ins.severity] || 'text-zinc-500'}`}>
                  {ins.severity}
                </span>
                <span className="shrink-0 text-[12px] text-zinc-600">{relativeTime(ins.timestamp)}</span>
              </div>
              <p className="mt-1 truncate pl-3.5 text-[13px] text-zinc-500" title={ins.detail}>
                {ins.detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
