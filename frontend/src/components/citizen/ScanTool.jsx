import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { submitDetection } from '../../api/detect'
import ScanResult from './ScanResult'

/**
 * Reusable citizen scan tool. Powers Check URL / Check Email / Check SMS by
 * posting to the SAME detection backend (/api/detect) and rendering a friendly
 * result. Only the labels, input type and detection `type` differ per page.
 */
export default function ScanTool({
  type,
  icon: Icon,
  title,
  subtitle,
  placeholder,
  multiline = false,
  buttonLabel = 'Check now',
  reportCategory,
  accent = 'sky',
  initialValue = '',
  embedded = false,
}) {
  const [content, setContent] = useState(initialValue)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const accentBtn = {
    sky: 'bg-sky-600 hover:bg-sky-500',
    purple: 'bg-purple-600 hover:bg-purple-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
  }[accent]

  const accentIcon = {
    sky: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
    purple: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    emerald: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  }[accent]

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

  const body = (
    <>
      {embedded && (
        <p className="mb-3 text-sm text-slate-400">{subtitle}</p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3">
        {multiline ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            rows={7}
            className="w-full resize-y rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
          />
        ) : (
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-sky-500 focus:outline-none"
          />
        )}

        <button
          type="submit"
          disabled={loading || !content.trim()}
          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-medium text-white transition disabled:opacity-50 ${accentBtn}`}
        >
          {loading ? <Loader2 size={17} className="animate-spin" /> : <Search size={17} />}
          {loading ? 'Analyzing...' : buttonLabel}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded-lg border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      <ScanResult result={result} reportCategory={reportCategory} />
    </>
  )

  if (embedded) return body

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl border ${accentIcon}`}>
          <Icon size={24} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
          <p className="text-sm text-slate-400">{subtitle}</p>
        </div>
      </div>
      {body}
    </div>
  )
}
