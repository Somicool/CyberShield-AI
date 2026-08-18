import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, ShieldCheck, KeyRound, Loader2, Copy, Check } from 'lucide-react'
import Brand from '../components/Brand'
import { login, mfaSetup, mfaEnable } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { decodeRole, pathForRole } from '../lib/authRedirect'

const input =
  'w-full rounded-md border border-white/12 bg-black/35 px-3 py-2 text-slate-100 outline-none transition focus:border-cyan-400/50'

const otpInput = `${input} text-center font-mono text-[22px] tracking-[0.4em]`

/**
 * Police / administrator sign-in.
 *
 * Three stages, driven by what the backend returns:
 *
 *  1. credentials — email + password
 *  2. otp         — 401 "mfa_required": the account has an authenticator
 *  3. enroll      — mfa_enrollment_required: first sign-in, scan the QR
 *
 * Stage 3 only ever holds a short-lived enrollment token, which the API
 * refuses for anything except finishing enrollment.
 */
export default function Login() {
  const [stage, setStage] = useState('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [enrollment, setEnrollment] = useState(null) // { token, secret, otpauth_uri }
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { loginWithToken } = useAuth()
  const navigate = useNavigate()

  const finish = (accessToken) => {
    loginWithToken(accessToken)
    navigate(pathForRole(decodeRole(accessToken)))
  }

  async function submitCredentials(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await login({ email, password, otp: stage === 'otp' ? otp : undefined })

      if (res.mfa_enrollment_required) {
        // Password accepted, but this officer has no authenticator yet.
        const setup = await mfaSetup(res.enrollment_token)
        setEnrollment({ token: res.enrollment_token, ...setup })
        setOtp('')
        setStage('enroll')
        return
      }
      finish(res.access_token)
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail === 'mfa_required') {
        // Correct password; the second factor is still outstanding.
        setStage('otp')
        setError('')
      } else {
        setError(detail || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  async function submitEnrollment(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await mfaEnable(enrollment.token, otp)
      finish(access_token)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not verify that code.')
    } finally {
      setLoading(false)
    }
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(enrollment.secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const restart = () => {
    setStage('credentials')
    setOtp('')
    setEnrollment(null)
    setError('')
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-white/10 bg-slate-900/80 p-8 backdrop-blur-md">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-300">
          <ArrowLeft size={13} /> Back to role selection
        </Link>

        <div>
          <h1 className="text-2xl font-semibold text-white">
            <Brand />
          </h1>
          <p className="text-sm text-slate-400">Police officer sign in</p>
        </div>

        {error && (
          <p className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {/* ---- stage 1: credentials ---------------------------------- */}
        {stage === 'credentials' && (
          <form onSubmit={submitCredentials} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-slate-300">Email</label>
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {loading ? 'Verifying…' : 'Sign in'}
            </button>

            <p className="flex items-start gap-1.5 text-[12px] leading-relaxed text-slate-500">
              <KeyRound size={12} className="mt-0.5 shrink-0" />
              Officer accounts require an authenticator app. Accounts lock for 15 minutes after 5 failed attempts.
            </p>
          </form>
        )}

        {/* ---- stage 2: existing authenticator ----------------------- */}
        {stage === 'otp' && (
          <form onSubmit={submitCredentials} className="space-y-4">
            <p className="text-sm text-slate-300">
              Enter the 6-digit code from your authenticator app for{' '}
              <span className="font-medium text-slate-100">{email}</span>.
            </p>
            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className={otpInput}
            />
            <button type="submit" disabled={loading || otp.length < 6} className="btn-primary w-full py-2.5">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {loading ? 'Verifying…' : 'Verify and sign in'}
            </button>
            <button type="button" onClick={restart} className="w-full text-center text-xs text-slate-500 hover:text-slate-300">
              Use a different account
            </button>
          </form>
        )}

        {/* ---- stage 3: first-time enrollment ------------------------ */}
        {stage === 'enroll' && enrollment && (
          <form onSubmit={submitEnrollment} className="space-y-4">
            <div className="rounded-md border border-cyan-400/25 bg-cyan-400/8 px-3 py-2 text-[13px] text-cyan-100">
              Two-factor authentication is required for officer accounts. Set it up once to continue.
            </div>

            <ol className="space-y-1 text-[13px] text-slate-300">
              <li>1. Open Google Authenticator, Authy or Microsoft Authenticator.</li>
              <li>2. Scan this QR code.</li>
              <li>3. Enter the 6-digit code it shows.</li>
            </ol>

            <div className="flex justify-center rounded-md bg-white p-3">
              <QRCodeSVG value={enrollment.otpauth_uri} size={168} level="M" />
            </div>

            <button
              type="button"
              onClick={copySecret}
              className="flex w-full items-center justify-center gap-1.5 text-[12px] text-slate-500 transition hover:text-slate-300"
              title="Use this if you cannot scan the QR code"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? 'Secret copied' : 'Can’t scan? Copy the setup key'}
            </button>

            <input
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className={otpInput}
            />

            <button type="submit" disabled={loading || otp.length < 6} className="btn-primary w-full py-2.5">
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {loading ? 'Confirming…' : 'Confirm and sign in'}
            </button>
            <button type="button" onClick={restart} className="w-full text-center text-xs text-slate-500 hover:text-slate-300">
              Cancel
            </button>
          </form>
        )}

        {stage === 'credentials' && (
          <p className="text-center text-sm text-slate-400">
            No account?{' '}
            <Link to="/signup" className="text-cyan-300 hover:underline">
              Register as an officer
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
