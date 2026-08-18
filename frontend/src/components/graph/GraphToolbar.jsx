import { useEffect, useRef, useState } from 'react'
import { Search, Download, RotateCcw, Image, Printer, Save, ChevronDown, Loader2 } from 'lucide-react'
import { ENTITY_QUERY_TYPES, typeLabel } from '../../lib/graphModel'

const field =
  'h-9 rounded-md border border-white/10 bg-black/35 px-2.5 text-[13px] text-zinc-200 outline-none transition focus:border-cyan-400/40'
const ghost =
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-black/35 px-2.5 text-[13px] text-zinc-300 transition hover:border-white/20 hover:text-zinc-100'

/**
 * Single-line control bar: [Entity Type] [Search Entity] [Search] and then the
 * secondary controls — depth, layout, export and reset. Deliberately compact so
 * the graph itself stays the focus of the page.
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
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-[#111722]/82 px-2.5 py-2 backdrop-blur-md">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSearch()
        }}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <select
          aria-label="Entity type"
          value={searchType}
          onChange={(e) => onSearchType(e.target.value)}
          className={field}
        >
          {ENTITY_QUERY_TYPES.map((t) => (
            <option key={t} value={t}>
              {typeLabel(t)}
            </option>
          ))}
        </select>

        <div className="relative min-w-40 flex-1">
          <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            aria-label="Search entity value"
            placeholder="Search a domain, wallet, email, phone or Telegram handle…"
            value={searchValue}
            onChange={(e) => onSearchValue(e.target.value)}
            className={`${field} w-full pl-8`}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary h-9 px-3 text-[13px]"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </form>

      <span className="hidden h-6 w-px bg-white/10 sm:block" />

      <select
        aria-label="Relationship depth"
        title="Relationship depth"
        value={depth}
        onChange={(e) => onDepth(Number(e.target.value))}
        className={field}
      >
        <option value={1}>Depth 1</option>
        <option value={2}>Depth 2</option>
        <option value={3}>Depth 3</option>
      </select>

      <select
        aria-label="Layout"
        title="Layout"
        value={layout}
        onChange={(e) => onLayout(e.target.value)}
        className={field}
      >
        <option value="force">Force</option>
        <option value="spread">Spread</option>
        <option value="compact">Compact</option>
      </select>

      <div className="relative" ref={exportRef}>
        <button onClick={() => setExportOpen((o) => !o)} className={ghost} aria-expanded={exportOpen}>
          <Download size={14} /> Export <ChevronDown size={12} />
        </button>
        {exportOpen && (
          <div className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-md border border-white/10 bg-[#111722]/82 py-1 shadow-xl">
            {[
              [Image, 'Export Graph Image (PNG)', onExportPng],
              [Printer, 'Print Graph', onPrint],
              [Save, 'Save Investigation Snapshot', onSnapshot],
            ].map(([Icon, label, fn]) => (
              <button
                key={label}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-zinc-300 hover:bg-white/5 hover:text-zinc-100"
                onClick={() => {
                  setExportOpen(false)
                  fn()
                }}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={onReset} title="Reset view" className={ghost}>
        <RotateCcw size={14} /> Reset
      </button>
    </div>
  )
}
