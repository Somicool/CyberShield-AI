import { useEffect, useRef, useState } from 'react'
import { Search, Download, RotateCcw, Image, Printer, Save, ChevronDown, Loader2 } from 'lucide-react'
import { ENTITY_QUERY_TYPES, typeLabel } from '../../lib/graphModel'

const selectClass =
  'rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-200 focus:border-purple-600 focus:outline-none'

/**
 * Section 1 / 9 — search + graph controls: entity search, relationship depth,
 * layout selector, export menu and reset view.
 */
export default function GraphToolbar({
  searchType,
  searchValue,
  onSearchType,
  onSearchValue,
  onSearch,
  depth,
  onDepth,
  layout,
  onLayout,
  onExportPng,
  onPrint,
  onSnapshot,
  onReset,
  loading,
}) {
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef(null)

  useEffect(() => {
    if (!exportOpen) return
    const onDoc = (e) => exportRef.current && !exportRef.current.contains(e.target) && setExportOpen(false)
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [exportOpen])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSearch()
        }}
        className="flex flex-1 flex-wrap items-center gap-2"
      >
        <select aria-label="Entity type" value={searchType} onChange={(e) => onSearchType(e.target.value)} className={selectClass}>
          {ENTITY_QUERY_TYPES.map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </select>

        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            aria-label="Search entity value"
            placeholder="Search a domain, wallet, email, phone or Telegram handle..."
            value={searchValue}
            onChange={(e) => onSearchValue(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-3 text-sm focus:border-purple-600 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          Search
        </button>
      </form>

      <select aria-label="Relationship depth" value={depth} onChange={(e) => onDepth(Number(e.target.value))} className={selectClass} title="Relationship depth">
        <option value={1}>Depth 1</option>
        <option value={2}>Depth 2</option>
        <option value={3}>Depth 3</option>
      </select>

      <select aria-label="Layout" value={layout} onChange={(e) => onLayout(e.target.value)} className={selectClass} title="Layout">
        <option value="force">Force layout</option>
        <option value="spread">Spread layout</option>
        <option value="compact">Compact layout</option>
      </select>

      <div className="relative" ref={exportRef}>
        <button
          onClick={() => setExportOpen((o) => !o)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
        >
          <Download size={15} /> Export <ChevronDown size={13} />
        </button>
        {exportOpen && (
          <div className="absolute right-0 z-30 mt-1 w-52 rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-800" onClick={() => { setExportOpen(false); onExportPng() }}>
              <Image size={14} /> Export Graph Image (PNG)
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-800" onClick={() => { setExportOpen(false); onPrint() }}>
              <Printer size={14} /> Print Graph
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-slate-800" onClick={() => { setExportOpen(false); onSnapshot() }}>
              <Save size={14} /> Save Investigation Snapshot
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onReset}
        title="Reset view"
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
      >
        <RotateCcw size={15} /> Reset
      </button>
    </div>
  )
}
