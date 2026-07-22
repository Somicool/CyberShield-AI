import { useState } from 'react'
import { submitDetection } from '../api/detect'
import ThreatBadge from '../components/ThreatBadge'

const TYPES = [
  { value: 'url', label: 'URL / Link' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS / Text Message' },
]

export default function CheckThreat() {
  const [type, setType] = useState('url')
  const [content, setContent] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await submitDetection({ type, content: content.trim() })
      setResult(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Check Threat</h2>
        <p className="text-sm text-slate-500">Check a suspicious URL, email, or text message</p>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`px-4 py-2 rounded text-sm border transition ${
                  type === t.value
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              type === 'url'
                ? 'Paste the URL here, e.g. http://suspicious-site.com'
                : 'Paste the full email or SMS text here'
            }
            rows={type === 'url' ? 2 : 6}
            className="w-full bg-slate-900 border border-slate-800 rounded px-4 py-3 text-sm focus:outline-none focus:border-purple-600 resize-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 py-3 rounded font-medium"
          >
            {loading ? 'Analyzing...' : 'Check for Scams'}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-red-400 text-sm bg-red-950/50 border border-red-900 rounded px-3 py-2">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold font-mono">{result.risk_score.toFixed(0)}/100</span>
              <ThreatBadge level={result.threat_level} />
            </div>

            <p className="text-slate-300 leading-relaxed">{result.explanation}</p>

            {result.heuristics_triggered.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Warning signs</p>
                <ul className="space-y-1">
                  {result.heuristics_triggered.map((h, i) => (
                    <li key={i} className="text-sm text-slate-400">
                      • {h.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
