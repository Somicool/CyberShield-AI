import { useNavigate } from 'react-router-dom'
import { Users, Shield, ArrowRight, ShieldCheck, Share2, Scale, Lock } from 'lucide-react'
import Brand from '../components/Brand'

const CYBER_IMAGE = "url('/cyberpolice.jpg')"

/**
 * Role Selection — the platform's front door.
 *
 * Presented as an official cyber-crime portal rather than a generic app splash:
 * the Gujarat Police emblem carries the institutional identity, the cyber
 * artwork sits in a framed command-center panel, and the two entry points are
 * clearly separated by audience.
 *
 * Purely presentational — it chooses a route and touches no auth logic.
 */

/**
 * The emblem PNG has an opaque white background (8-bit indexed, no alpha), so
 * it is mounted on a light plate. That reads as an official seal affixed to the
 * interface instead of a white rectangle floating on a dark page.
 */
function Emblem({ className = 'h-16' }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white/95 p-1.5 shadow-lg ring-1 ring-white/25">
      <img src="/gujaratpolice.png" alt="Gujarat Police emblem" className={`${className} w-auto`} />
    </span>
  )
}

/** Corner brackets — the HUD framing used around the operations artwork. */
function Bracket({ position }) {
  const base = 'pointer-events-none absolute h-5 w-5 border-cyan-400/60'
  const edges = {
    tl: 'left-0 top-0 border-l-2 border-t-2',
    tr: 'right-0 top-0 border-r-2 border-t-2',
    bl: 'bottom-0 left-0 border-b-2 border-l-2',
    br: 'bottom-0 right-0 border-b-2 border-r-2',
  }
  return <span className={`${base} ${edges[position]}`} />
}

function LandingBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Atmospheric wash from the cyber artwork — blurred hard so it reads as
          depth behind the interface, never as a competing picture. */}
      <div
        className="absolute inset-0 scale-125 bg-cover bg-center opacity-35 blur-3xl"
        style={{ backgroundImage: CYBER_IMAGE }}
      />
      <div className="absolute inset-0 bg-linear-to-br from-slate-950/85 via-slate-950/75 to-slate-950/90" />

      {/* Faint operational grid. */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,211,238,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.10) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.14),transparent_55%)]" />
    </div>
  )
}

const CAPABILITIES = [
  { icon: ShieldCheck, text: 'AI-assisted detection of phishing links, emails, SMS and QR codes' },
  { icon: Share2, text: 'Threat-intelligence graph linking entities across investigations' },
  { icon: Scale, text: 'Case documentation and legal drafting support for officers' },
]

export default function RoleSelection() {
  const navigate = useNavigate()

  const cards = [
    {
      role: 'citizen',
      title: 'Citizen',
      subtitle: 'Public Services',
      desc: 'Report a cyber crime, check anything suspicious, and follow your complaint.',
      points: ['Report cyber crime', 'Check links, emails, SMS, QR'],
      icon: Users,
      // Periwinkle — matches the citizen portal's own theme.
      ring: 'hover:border-indigo-400/60',
      iconTone: 'border-indigo-400/40 bg-indigo-400/12 text-indigo-300',
      ctaTone: 'text-indigo-200',
      cta: 'Continue as Citizen',
      to: '/citizen/login',
    },
    {
      role: 'police',
      title: 'Police Officer',
      subtitle: 'Restricted Access',
      desc: 'Investigation dashboard, threat intelligence and CrimeGPT legal tools.',
      points: ['Live threat feed and cases', 'Two-factor sign-in required'],
      icon: Shield,
      ring: 'hover:border-cyan-400/60',
      iconTone: 'border-cyan-400/40 bg-cyan-400/12 text-cyan-300',
      ctaTone: 'text-cyan-200',
      cta: 'Continue as Officer',
      to: '/login',
    },
  ]

  return (
    <div className="min-h-screen text-white">
      <LandingBackdrop />

      {/* ---- official header bar ---------------------------------------- */}
      <header className="border-b border-white/8 bg-slate-950/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <Emblem className="h-9" />
            <div className="leading-tight">
              <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-200">
                Gujarat Police
              </div>
              <div className="text-[11.5px] uppercase tracking-[0.14em] text-slate-500">
                Cyber Crime Investigation Cell
              </div>
            </div>
          </div>

          <span className="hidden items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] uppercase tracking-[0.12em] text-slate-400 sm:inline-flex">
            <Lock size={11} /> Restricted System
          </span>
        </div>
      </header>

      {/* ---- main ------------------------------------------------------- */}
      <main className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:py-16">
        {/* left: identity + choices */}
        <div>
          <div className="flex items-start gap-4">
            <Emblem className="h-20" />
            <div className="min-w-0 pt-1">
              <p className="text-[11.5px] uppercase tracking-[0.22em] text-cyan-300/80">
                Cyber Crime Intelligence Platform
              </p>
              <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
                <Brand />
              </h1>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-300">
                A single platform connecting citizens who report cyber crime with the officers who
                investigate it.
              </p>
            </div>
          </div>

          <ul className="mt-7 space-y-2.5">
            {CAPABILITIES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed text-slate-400">
                <Icon size={15} className="mt-0.5 shrink-0 text-cyan-300/70" />
                {text}
              </li>
            ))}
          </ul>

          <div className="mt-9">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Select your access
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((c) => {
                const Icon = c.icon
                return (
                  <button
                    key={c.role}
                    onClick={() => navigate(c.to)}
                    className={`group flex flex-col items-start rounded-xl border border-white/10 bg-slate-950/55 p-5 text-left backdrop-blur-md transition hover:bg-slate-950/70 ${c.ring}`}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <span
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border ${c.iconTone}`}
                      >
                        <Icon size={21} />
                      </span>
                      <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10.5px] uppercase tracking-[0.12em] text-slate-500">
                        {c.subtitle}
                      </span>
                    </div>

                    <h2 className="mt-4 text-[17px] font-semibold text-slate-50">{c.title}</h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{c.desc}</p>

                    <ul className="mt-3 space-y-1">
                      {c.points.map((p) => (
                        <li key={p} className="flex items-center gap-1.5 text-[12.5px] text-slate-500">
                          <span className="h-1 w-1 rounded-full bg-slate-500" />
                          {p}
                        </li>
                      ))}
                    </ul>

                    <span
                      className={`mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium ${c.ctaTone} transition-all group-hover:gap-2.5`}
                    >
                      {c.cta} <ArrowRight size={14} />
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* right: framed operations artwork. The frame is close to the image's
            native 447px, so it stays sharp instead of being upscaled. */}
        <div className="hidden lg:block">
          <figure className="relative mx-auto w-full max-w-md">
            <div className="relative overflow-hidden rounded-xl border border-white/12 bg-slate-950/60 p-2 backdrop-blur-md">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-950">
                <img
                  src="/cyberpolice.jpg"
                  alt=""
                  className="h-full w-full object-contain"
                  loading="eager"
                />
                {/* scan sheen + vignette so it sits in the interface */}
                <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/70 via-transparent to-slate-950/25" />
                <div
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, rgba(34,211,238,0.10) 0px, rgba(34,211,238,0.10) 1px, transparent 1px, transparent 4px)',
                  }}
                />
                <Bracket position="tl" />
                <Bracket position="tr" />
                <Bracket position="bl" />
                <Bracket position="br" />
              </div>

              <figcaption className="flex items-center justify-between gap-2 px-2 pb-1 pt-2.5">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                  Cyber Crime Command Center
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-cyan-300/80">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  </span>
                  Online
                </span>
              </figcaption>
            </div>
          </figure>
        </div>
      </main>

      {/* ---- footer ----------------------------------------------------- */}
      <footer className="border-t border-white/8 bg-slate-950/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-3.5">
          <p className="text-[12px] text-slate-500">
            Protecting citizens and empowering law enforcement against cybercrime.
          </p>
          <p className="text-[11.5px] text-slate-600">
            Authorised use only · Officer accounts require two-factor authentication · Access is logged
          </p>
        </div>
      </footer>
    </div>
  )
}
