import { useNavigate } from 'react-router-dom'
import { Users, Shield, ArrowRight } from 'lucide-react'

/**
 * Role Selection — the first screen before login. Sends citizens to the
 * friendly Citizen Portal login and officers to the existing police login.
 * Purely a routing chooser; it does not change any auth logic.
 */
export default function RoleSelection() {
  const navigate = useNavigate()

  const cards = [
    {
      role: 'citizen',
      title: 'Citizen',
      desc: 'Report cybercrime, check suspicious links, emails, SMS and QR codes, and stay safe online.',
      icon: Users,
      accent: 'from-sky-600/20 to-emerald-600/10 border-sky-500/40 hover:border-sky-400/70',
      iconTone: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
      cta: 'Continue as Citizen',
      to: '/citizen/login',
    },
    {
      role: 'police',
      title: 'Police Officer',
      desc: 'Access the advanced investigation dashboard, threat intelligence and CrimeGPT legal tools.',
      icon: Shield,
      accent: 'from-purple-600/20 to-slate-800/10 border-purple-500/40 hover:border-purple-400/70',
      iconTone: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
      cta: 'Continue as Officer',
      to: '/login',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">CyberShield AI</h1>
          <p className="mt-2 text-slate-400">Choose how you would like to continue</p>
        </div>

        <div className="grid w-full gap-5 sm:grid-cols-2">
          {cards.map((c) => {
            const Icon = c.icon
            return (
              <button
                key={c.role}
                onClick={() => navigate(c.to)}
                className={`group flex flex-col items-start rounded-2xl border bg-linear-to-br ${c.accent} p-7 text-left transition`}
              >
                <span className={`inline-flex h-14 w-14 items-center justify-center rounded-xl border ${c.iconTone}`}>
                  <Icon size={28} />
                </span>
                <h2 className="mt-5 text-xl font-semibold">{c.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{c.desc}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-200 group-hover:gap-2.5 transition-all">
                  {c.cta} <ArrowRight size={16} />
                </span>
              </button>
            )
          })}
        </div>

        <p className="mt-10 text-center text-xs text-slate-600">
          Protecting citizens and empowering law enforcement against cybercrime.
        </p>
      </div>
    </div>
  )
}
