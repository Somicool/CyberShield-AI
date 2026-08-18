import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileWarning, ShieldQuestion, DatabaseZap, Puzzle, BookOpen, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { getMe } from '../../api/auth'
import { SAFETY_TOPICS } from '../../lib/safetyContent'
import { Panel, PanelHead, PanelLink } from '../../components/citizen/Panel'

/**
 * The four things a citizen can do. Link, email, SMS and QR checks all live
 * inside "Check Suspicious Activity" (the Check page's tabs), so the home
 * screen stays a short list of decisions rather than seven near-identical
 * tiles. Data Breach Check has no backend yet and is shown as planned rather
 * than as a working button.
 */
const QUICK_ACTIONS = [
  {
    label: 'Report Cyber Crime',
    desc: 'File a complaint and get a reference number to track it.',
    icon: FileWarning,
    to: '/citizen/report',
    tone: 'border-red-500/35 bg-red-500/10 text-red-300',
  },
  {
    label: 'Check Suspicious Activity',
    desc: 'Check a link, email, SMS or QR code before you trust it.',
    icon: ShieldQuestion,
    to: '/citizen/check',
    tone: 'border-cyan-500/35 bg-cyan-500/10 text-cyan-300',
  },
  {
    label: 'Data Breach Check',
    desc: 'See if your email appears in a known data breach.',
    icon: DatabaseZap,
    to: null,
    tone: 'border-white/10 bg-white/5 text-slate-400',
    soon: true,
  },
  {
    label: 'CyberAid Guardian',
    desc: 'Browser add-on that warns you about scam sites as you browse.',
    icon: Puzzle,
    to: '/citizen/guardian',
    tone: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-300',
  },
]

/** Plain-language orientation shown inside the welcome panel. */
const GUIDANCE = [
  'Not sure about a message, link or QR code? Check it first — it takes a few seconds.',
  'Already lost money or personal data? Report it. You will get a reference number to follow your case.',
  'Want to be warned automatically while you browse? Install CyberAid Guardian.',
]

function firstName(me) {
  if (!me?.full_name) return null
  return me.full_name.trim().split(/\s+/)[0]
}

export default function CitizenHome() {
  const [me, setMe] = useState(null)

  useEffect(() => {
    getMe().then(setMe).catch(() => {})
  }, [])

  return (
    <div className="min-h-full">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 p-6 sm:p-8">
        {/* Welcome — the orientation panel, deliberately the largest thing on
            the page so a first-time visitor knows what this portal is for. */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-linear-to-br from-cyan-500/12 via-slate-900/45 to-slate-900/25 p-7 backdrop-blur-md sm:p-9">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-400/10 text-cyan-300">
              <ShieldCheck size={28} />
            </span>
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl">
                Hello{firstName(me) ? `, ${firstName(me)}` : ''}
              </h1>
              <p className="mt-1.5 max-w-2xl text-base text-slate-300">
                Welcome to CyberAid — the citizen side of your state cyber crime platform. You can check
                something that looks suspicious, report a cyber crime, and follow what happens next.
              </p>
            </div>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            {GUIDANCE.map((line) => (
              <li
                key={line}
                className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/4 px-3.5 py-3 text-[14px] leading-relaxed text-slate-300"
              >
                <ArrowRight size={14} className="mt-1 shrink-0 text-cyan-300/80" />
                {line}
              </li>
            ))}
          </ul>
        </section>

        {/* The four things you can do */}
        <h2 className="mt-1 text-[13.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          What would you like to do?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_ACTIONS.map(({ label, desc, icon: Icon, to, tone, soon }) => {
            const inner = (
              <div
                className={`flex h-full flex-col gap-3 rounded-xl border border-white/10 bg-slate-900/80 p-5 backdrop-blur-md transition ${
                  to ? 'hover:border-cyan-500/40 hover:bg-slate-900/90' : 'cursor-default opacity-80'
                }`}
              >
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border ${tone}`}>
                  <Icon size={22} />
                </span>
                <span className="text-base font-semibold leading-snug text-slate-100">{label}</span>
                <span className="text-[13.5px] leading-relaxed text-slate-400">{desc}</span>
                {soon ? (
                  <span className="mt-auto inline-flex w-fit rounded-full border border-white/12 px-2 py-0.5 text-[11.5px] text-slate-400">
                    Coming soon
                  </span>
                ) : (
                  <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-medium text-cyan-300/90">
                    Open <ArrowRight size={12} />
                  </span>
                )}
              </div>
            )
            return to ? (
              <Link key={label} to={to}>
                {inner}
              </Link>
            ) : (
              <div key={label}>{inner}</div>
            )
          })}
        </div>

        {/* Cyber safety tips */}
        <Panel className="mt-1">
          <PanelHead title="Cyber Safety Tips" action={<PanelLink to="/citizen/safety">See all</PanelLink>} />
          <div className="grid divide-y divide-white/6 sm:grid-cols-3 sm:divide-y-0 sm:divide-x">
            {SAFETY_TOPICS.slice(0, 3).map((t) => (
              <Link key={t.id} to="/citizen/safety" className="group px-4 py-3.5 transition hover:bg-white/4">
                <BookOpen size={17} className="text-emerald-300/80" />
                <div className="mt-2 text-[14.5px] font-semibold text-slate-100">{t.title}</div>
                <div className="mt-0.5 text-[13px] leading-relaxed text-slate-400">{t.summary}</div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
