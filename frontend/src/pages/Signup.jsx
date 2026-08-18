import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Loader2 } from 'lucide-react'
import { signupOfficer } from '../api/auth'

const input =
  'w-full rounded-md border border-white/12 bg-black/35 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400/50'

/**
 * Officer registration.
 *
 * This is the police side of the platform, so it calls /auth/signup/officer,
 * which requires the department registration code. Without a valid code the
 * backend refuses — and if the deployment has officer self-registration turned
 * off entirely, it returns 403 and an administrator must create the account.
 *
 * The public /auth/signup endpoint used by the citizen portal can only ever
 * create citizen accounts, so there is no path from here to a privileged role.
 */
export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signupOfficer({
        email,
        password,
        full_name: fullName,
        access_code: accessCode.trim(),
      })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-white/10 bg-slate-900/80 p-8 backdrop-blur-md"
      >
        <Link to="/login" className="inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-300">
          <ArrowLeft size={13} /> Back to sign in
        </Link>

        <div>
          <h1 className="text-2xl font-semibold text-white">Officer registration</h1>
          <p className="text-sm text-slate-400">Authorised law-enforcement personnel only.</p>
        </div>

        {error && (
          <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Department access code</label>
          <input
            type="text"
            required
            autoComplete="off"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            placeholder="Issued by your cyber crime unit"
            className={`${input} font-mono tracking-wider`}
          />
          <p className="text-[12px] text-slate-500">
            Do not have a code? Ask an administrator to create your account.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Full name</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Official email</label>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Password</label>
          <input
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
          <p className="text-[12px] text-slate-500">At least 12 characters for officer accounts.</p>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />}
          {loading ? 'Creating account…' : 'Register'}
        </button>

        <p className="text-[12px] leading-relaxed text-slate-500">
          You will be asked to set up an authenticator app the first time you sign in.
        </p>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="text-cyan-300 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
