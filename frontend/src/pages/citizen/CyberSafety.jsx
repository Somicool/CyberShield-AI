import { useState } from 'react'
import {
  BookOpen, Fish, IndianRupee, QrCode, KeyRound, Briefcase, Users, ChevronDown,
} from 'lucide-react'
import { SAFETY_TOPICS } from '../../lib/safetyContent'
import { PageHeader, Panel, PanelHead } from '../../components/citizen/Panel'

const ICONS = { Fish, IndianRupee, QrCode, KeyRound, Briefcase, Users }

/** Cyber Safety Center — simple educational cards citizens can expand to read. */
export default function CyberSafety() {
  const [open, setOpen] = useState(SAFETY_TOPICS[0].id)

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 p-6 sm:p-8">
        <PageHeader
          title="Cyber Safety Center"
          subtitle="Simple tips to stay safe from online scams."
        />

        <Panel>
          <PanelHead title="Topics" hint={`${SAFETY_TOPICS.length} guides`} />
          <ul className="divide-y divide-white/6">
            {SAFETY_TOPICS.map((t) => {
              const Icon = ICONS[t.icon] || BookOpen
              const isOpen = open === t.id
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setOpen(isOpen ? null : t.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/4"
                  >
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-semibold text-slate-100">{t.title}</div>
                      <div className="truncate text-[12.5px] text-slate-500">{t.summary}</div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <ul className="space-y-1.5 border-t border-white/6 bg-black/15 px-5 py-3.5">
                      {t.points.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-[14px] leading-relaxed text-slate-300">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
