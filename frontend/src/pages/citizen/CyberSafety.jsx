import { useState } from 'react'
import {
  BookOpen, Fish, IndianRupee, QrCode, KeyRound, Briefcase, Users, ChevronDown,
} from 'lucide-react'
import { SAFETY_TOPICS } from '../../lib/safetyContent'

const ICONS = { Fish, IndianRupee, QrCode, KeyRound, Briefcase, Users }

/** Cyber Safety Center — simple educational cards citizens can expand to read. */
export default function CyberSafety() {
  const [open, setOpen] = useState(SAFETY_TOPICS[0].id)

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300">
          <BookOpen size={24} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Cyber Safety Center</h1>
          <p className="text-sm text-slate-400">Simple tips to stay safe from online scams.</p>
        </div>
      </div>

      <div className="space-y-3">
        {SAFETY_TOPICS.map((t) => {
          const Icon = ICONS[t.icon] || BookOpen
          const isOpen = open === t.id
          return (
            <div key={t.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
              <button
                onClick={() => setOpen(isOpen ? null : t.id)}
                className="flex w-full items-center gap-3 px-4 py-4 text-left"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  <Icon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-100">{t.title}</div>
                  <div className="truncate text-xs text-slate-500">{t.summary}</div>
                </div>
                <ChevronDown size={18} className={`shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <ul className="space-y-2 border-t border-slate-800 px-5 py-4">
                  {t.points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
