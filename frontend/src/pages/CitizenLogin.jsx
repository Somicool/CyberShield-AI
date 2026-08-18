import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { decodeRole, pathForRole } from '../lib/authRedirect'

/**
 * Citizen login — a friendlier, simpler sign-in for civilians. Uses the exact
 * same auth API as the police login; only the styling and post-login redirect
 * differ (citizens go to the Citizen Portal).
 */
export default function CitizenLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { loginWithToken } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { access_token } = await login({ email, password })
      loginWithToken(access_token)
      navigate(pathForRole(decodeRole(access_token)))
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="portal-citizen min-h-screen flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-8 backdrop-blur-md space-y-5">
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
          <ArrowLeft size={13} /> Back
        </Link>

        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 text-sky-300">
            <ShieldCheck size={24} />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-white">Welcome back</h1>
            <p className="text-sm text-slate-400">Sign in to your CyberAid account</p>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-slate-800/75 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-slate-800/75 border border-slate-700 px-3 py-2.5 text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-2.5 font-medium transition"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/citizen/signup" className="text-sky-400 hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  )
}
