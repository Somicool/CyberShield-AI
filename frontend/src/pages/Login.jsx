import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { login } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { decodeRole, pathForRole } from '../lib/authRedirect'

export default function Login() {
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
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-lg p-8 space-y-4"
      >
        <Link to="/" className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
          <ArrowLeft size={13} /> Back to role selection
        </Link>
        <h1 className="text-2xl font-semibold text-white">CyberShield AI</h1>
        <p className="text-slate-400 text-sm">Police Officer sign in</p>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white py-2 font-medium transition"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>

        <p className="text-sm text-slate-400 text-center">
          No account?{' '}
          <Link to="/signup" className="text-purple-400 hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  )
}
