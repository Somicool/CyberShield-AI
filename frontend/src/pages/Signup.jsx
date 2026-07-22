import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signup } from '../api/auth'

export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup({ email, password, full_name: fullName })
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed')
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
        <h1 className="text-2xl font-semibold text-white">Create account</h1>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="text-sm text-slate-300">Full name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded bg-slate-800 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          />
        </div>

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
          {loading ? 'Creating account...' : 'Sign up'}
        </button>

        <p className="text-sm text-slate-400 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
