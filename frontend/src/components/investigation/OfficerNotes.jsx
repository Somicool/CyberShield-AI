import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'

/**
 * Section 10 — Officer Notes. Debounced autosave to the workflow store
 * (localStorage) until a backend notes API exists.
 */
export default function OfficerNotes({ value, onSave }) {
  const [text, setText] = useState(value || '')
  const [saved, setSaved] = useState(false)
  const timer = useRef(null)

  // Sync when switching to a different case.
  useEffect(() => {
    setText(value || '')
  }, [value])

  function handleChange(e) {
    const next = e.target.value
    setText(next)
    setSaved(false)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onSave(next)
      setSaved(true)
    }, 600)
  }

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div>
      <textarea
        value={text}
        onChange={handleChange}
        rows={6}
        placeholder="Record investigation observations, actions taken, coordination notes..."
        className="w-full resize-y rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-purple-600 focus:outline-none"
      />
      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
        {saved ? (
          <>
            <Check size={12} className="text-emerald-400" /> Saved locally
          </>
        ) : (
          'Notes autosave to this device until a backend notes API is connected.'
        )}
      </div>
    </div>
  )
}
