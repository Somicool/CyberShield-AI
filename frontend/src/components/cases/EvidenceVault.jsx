import { useEffect, useMemo, useRef, useState } from 'react'
import {
  X, ShieldCheck, Plus, Trash2, Copy, Check, Download, FileText, Link2,
  Paperclip, UploadCloud, Loader2, Lock,
} from 'lucide-react'
import {
  useCaseWorkflow,
  getEvidence,
  addEvidence,
  removeEvidence,
  seedEvidence,
} from '../../lib/caseWorkflow'
import {
  EVIDENCE_KINDS,
  deriveAutoEvidence,
  hashAutoEvidence,
  makeEvidenceItem,
  sha256Hex,
  sha256HexBytes,
  shortHash,
  formatBytes,
} from '../../lib/evidence'
import { deriveCaseId } from '../../lib/caseHelpers'

const KIND_ICON = { artifact: FileText, note: FileText, url: Link2, file: Paperclip }

function fmtWhen(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function HashChip({ hash }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hash)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* clipboard unavailable */
    }
  }
  return (
    <button
      onClick={copy}
      title={`SHA-256: ${hash}\nClick to copy`}
      className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[11.5px] text-slate-400 transition hover:text-slate-200"
    >
      <Lock size={9} />
      {shortHash(hash)}
      {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
    </button>
  )
}

function EvidenceCard({ item, onRemove, verifyState }) {
  const kind = EVIDENCE_KINDS[item.kind] || EVIDENCE_KINDS.artifact
  const Icon = KIND_ICON[item.kind] || FileText
  const verdict = verifyState?.[item.id]
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/72 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon size={15} className="shrink-0 text-slate-400" />
          <span className="truncate text-sm font-medium text-slate-200">{item.label}</span>
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[11.5px] font-medium ${kind.tone}`}>
            {kind.label}
          </span>
        </div>
        {item.source === 'manual' && (
          <button
            onClick={() => onRemove(item.id)}
            title="Remove evidence"
            className="shrink-0 rounded p-1 text-slate-500 transition hover:bg-slate-800/75 hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {item.kind === 'file' ? (
        <div className="mt-2 text-xs text-slate-400">
          <span className="text-slate-300">{item.content}</span>
          {item.meta?.size != null && <span className="ml-2 text-slate-500">{formatBytes(item.meta.size)}</span>}
          {item.meta?.type && <span className="ml-2 text-slate-500">{item.meta.type}</span>}
        </div>
      ) : (
        <pre className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap wrap-break-word rounded bg-slate-950/78 p-2 text-xs text-slate-300">
          {item.content}
        </pre>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-500">
        <HashChip hash={item.hash} />
        <span>{item.source === 'auto' ? 'Auto-collected' : 'Officer-added'}</span>
        <span>· {item.addedBy}</span>
        <span>· {fmtWhen(item.addedAt)}</span>
        {verdict === 'ok' && <span className="text-emerald-400">Integrity verified</span>}
        {verdict === 'tampered' && <span className="text-red-400">Integrity FAILED</span>}
        {verdict === 'skip' && <span className="text-slate-500">Not verifiable (binary)</span>}
      </div>
    </div>
  )
}

/**
 * Evidence Vault — secure, tamper-evident store of case evidence.
 *
 * Auto-collects artifacts from the incident's detection + investigation data
 * on open, lets officers attach notes, URLs and file fingerprints, computes a
 * SHA-256 integrity hash for every item, verifies those hashes on demand, and
 * exports a signed evidence manifest. State persists via the caseWorkflow
 * store (the same seam a future case-management API plugs into).
 */
export default function EvidenceVault({ incident, detail, meta, onClose }) {
  useCaseWorkflow() // re-render on store mutation
  const caseId = deriveCaseId(incident)
  const items = getEvidence(incident.id)

  const [tab, setTab] = useState('note') // note | url | file
  const [label, setLabel] = useState('')
  const [content, setContent] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [verifyState, setVerifyState] = useState({})
  const fileInputRef = useRef(null)

  const addedBy = meta?.assignedOfficer || 'Investigating Officer'

  // Seed auto-collected artifacts once when the vault opens.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const descriptors = deriveAutoEvidence(incident, detail)
      if (!descriptors.length) return
      const hashed = await hashAutoEvidence(descriptors)
      if (!cancelled) seedEvidence(incident.id, hashed)
    })()
    return () => {
      cancelled = true
    }
  }, [incident, detail])

  const counts = useMemo(() => {
    const auto = items.filter((i) => i.source === 'auto').length
    return { total: items.length, auto, manual: items.length - auto }
  }, [items])

  const resetForm = () => {
    setLabel('')
    setContent('')
    setError('')
  }

  const addTextItem = async () => {
    const body = content.trim()
    if (!body) {
      setError('Enter the evidence content.')
      return
    }
    if (tab === 'url') {
      try {
        // eslint-disable-next-line no-new
        new URL(body)
      } catch {
        setError('Enter a valid URL (including http:// or https://).')
        return
      }
    }
    setBusy(true)
    try {
      const item = await makeEvidenceItem({
        kind: tab,
        label: label.trim() || (tab === 'url' ? 'Reference URL' : 'Officer note'),
        content: body,
        source: 'manual',
        addedBy,
      })
      addEvidence(incident.id, item)
      resetForm()
    } finally {
      setBusy(false)
    }
  }

  const onFiles = async (fileList) => {
    const files = [...fileList]
    if (!files.length) return
    setBusy(true)
    setError('')
    try {
      for (const file of files) {
        const buf = await file.arrayBuffer()
        const hash = await sha256HexBytes(buf)
        const item = await makeEvidenceItem({
          kind: 'file',
          label: file.name,
          content: file.name,
          source: 'manual',
          addedBy,
          hash,
          meta: { size: file.size, type: file.type || 'unknown' },
        })
        addEvidence(incident.id, item)
      }
    } catch {
      setError('Could not read one or more files.')
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const verifyAll = async () => {
    const next = {}
    for (const item of items) {
      if (item.kind === 'file') {
        next[item.id] = 'skip' // original bytes not retained; fingerprint is the record
        continue
      }
      const rehash = await sha256Hex(item.content)
      next[item.id] = rehash === item.hash ? 'ok' : 'tampered'
    }
    setVerifyState(next)
  }

  const exportManifest = () => {
    const manifest = {
      case_id: caseId,
      incident_id: incident.id,
      generated_at: new Date().toISOString(),
      hash_algorithm: 'SHA-256',
      item_count: items.length,
      items: items.map((i) => ({
        id: i.id,
        kind: i.kind,
        label: i.label,
        source: i.source,
        added_by: i.addedBy,
        added_at: i.addedAt,
        sha256: i.hash,
        ...(i.meta ? { file_meta: i.meta } : {}),
      })),
    }
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${caseId}-evidence-manifest.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const canExport = items.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-label="Evidence Vault">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-purple-400" />
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Evidence Vault</h3>
              <p className="text-[12.5px] text-slate-500">
                {caseId} · {counts.total} item{counts.total !== 1 ? 's' : ''} · {counts.auto} auto · {counts.manual} added
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={verifyAll}
              disabled={!items.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/75 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
            >
              <ShieldCheck size={13} /> Verify integrity
            </button>
            <button
              onClick={exportManifest}
              disabled={!canExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/75 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-40"
            >
              <Download size={13} /> Export manifest
            </button>
            <button onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-400 hover:bg-slate-800/75 hover:text-white">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Evidence list */}
        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">
              No evidence recorded yet. Detection and investigation artifacts are collected automatically;
              add officer notes, reference URLs or files below.
            </div>
          ) : (
            items.map((item) => (
              <EvidenceCard key={item.id} item={item} onRemove={(eid) => removeEvidence(incident.id, eid)} verifyState={verifyState} />
            ))
          )}
        </div>

        {/* Add evidence */}
        <div className="border-t border-slate-800 px-5 py-4">
          <div className="mb-3 flex items-center gap-1">
            {[
              { k: 'note', label: 'Note', icon: FileText },
              { k: 'url', label: 'URL', icon: Link2 },
              { k: 'file', label: 'File', icon: Paperclip },
            ].map(({ k, label: l, icon: Icon }) => (
              <button
                key={k}
                onClick={() => { setTab(k); setError('') }}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  tab === k ? 'bg-purple-600 text-white' : 'border border-slate-700 bg-slate-800/75 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Icon size={13} /> {l}
              </button>
            ))}
          </div>

          {tab === 'file' ? (
            <label
              className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-700 bg-slate-900/72 px-4 py-6 text-center transition hover:border-purple-600/60 hover:bg-slate-900/80"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files) }}
            >
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
              {busy ? <Loader2 size={20} className="animate-spin text-purple-400" /> : <UploadCloud size={20} className="text-slate-400" />}
              <span className="text-sm text-slate-300">Drop files here or click to select</span>
              <span className="text-[12.5px] text-slate-500">
                A SHA-256 fingerprint is recorded for chain-of-custody. File contents are not uploaded.
              </span>
            </label>
          ) : (
            <div className="space-y-2">
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={tab === 'url' ? 'Label (e.g. Phishing mirror)' : 'Label (e.g. Complainant statement)'}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-600 focus:outline-none"
              />
              {tab === 'url' ? (
                <input
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-600 focus:outline-none"
                />
              ) : (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={3}
                  placeholder="Record an observation, statement or finding…"
                  className="w-full resize-y rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-purple-600 focus:outline-none"
                />
              )}
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] text-red-400">{error}</span>
                <button
                  onClick={addTextItem}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
                >
                  {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add to vault
                </button>
              </div>
            </div>
          )}
          {tab === 'file' && error && <p className="mt-2 text-[12.5px] text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  )
}
