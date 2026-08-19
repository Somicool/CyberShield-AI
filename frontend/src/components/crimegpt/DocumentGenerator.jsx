import { useState } from 'react'
import {
  FileText, Loader2, Check, Clock, Eye, Pencil, Trash2, Printer, Download, FileType, ArrowLeft,
} from 'lucide-react'
import Markdown from '../copilot/Markdown'
import { DOCUMENT_CATALOG, exportPdf, exportDocx, printDocument, exportMarkdown } from '../../lib/documents'
import { generateDocument, recordAudit } from '../../api/crimegpt'
import { saveDocument, updateDocumentContent, setDocumentStatus, removeDocument, addDiaryEntry } from '../../lib/crimegptStore'

const STATUS_TONE = {
  generated: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
  edited: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  finalized: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
}

/**
 * AI Document Generator + Document Tracker + Export.
 *
 * Generates editable drafts of all ten document types from the single
 * source-of-truth context (so every document auto-fills from the same
 * investigation data). Tracks which documents are generated vs pending, lets
 * officers edit and finalize, and exports to PDF, DOCX, Markdown or Print.
 */
export default function DocumentGenerator({ incidentId, caseId, context, crimeCase }) {
  const [busy, setBusy] = useState(null) // docType being generated
  const [openId, setOpenId] = useState(null) // document open in the editor
  const [mode, setMode] = useState('preview') // preview | edit
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  const docs = crimeCase.documents || []
  const byType = new Map(docs.map((d) => [d.docType, d]))
  const openDoc = docs.find((d) => d.id === openId) || null

  const generate = async (docType, title) => {
    setBusy(docType)
    setError('')
    try {
      const res = await generateDocument({ docType, context, incidentId, caseId })
      saveDocument(incidentId, {
        id: byType.get(docType)?.id, // regenerate replaces the existing draft of this type
        docType,
        title: res.title || title,
        content: res.content,
        source: res.source,
        status: 'generated',
      })
      addDiaryEntry(incidentId, { kind: 'event', auto: true, text: `Document generated: ${res.title || title}.` })
    } catch {
      setError(`Could not generate ${title}. Please try again.`)
    } finally {
      setBusy(null)
    }
  }

  const open = (doc, m = 'preview') => {
    setOpenId(doc.id)
    setDraft(doc.content)
    setMode(m)
  }

  const saveDraft = () => {
    updateDocumentContent(incidentId, openDoc.id, draft)
    setMode('preview')
  }

  const doExport = (fmt) => {
    if (!openDoc) return
    const opts = { caseId }
    if (fmt === 'pdf') exportPdf(openDoc.title, openDoc.content, opts)
    else if (fmt === 'docx') exportDocx(openDoc.title, openDoc.content, opts)
    else if (fmt === 'print') printDocument(openDoc.title, openDoc.content, opts)
    else if (fmt === 'md') exportMarkdown(openDoc.title, openDoc.content, opts)
    recordAudit({ action: 'document.export', incidentId, caseId, summary: `Exported ${openDoc.title} as ${fmt.toUpperCase()}`, detail: { docType: openDoc.docType, format: fmt } })
    addDiaryEntry(incidentId, { kind: 'event', auto: true, text: `Document exported (${fmt.toUpperCase()}): ${openDoc.title}.` })
  }

  // ---- single-document editor view ---------------------------------------
  if (openDoc) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/72 px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setOpenId(null)} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/75 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700">
              <ArrowLeft size={13} /> Back
            </button>
            <span className="text-sm font-semibold text-slate-100">{openDoc.title}</span>
            <span className={`rounded border px-1.5 py-0.5 text-[11.5px] font-medium ${STATUS_TONE[openDoc.status] || STATUS_TONE.generated}`}>{openDoc.status}</span>
            {openDoc.source === 'fallback' && <span className="text-[11.5px] text-amber-400">offline draft</span>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {mode === 'preview' ? (
              <button onClick={() => { setDraft(openDoc.content); setMode('edit') }} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/75 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"><Pencil size={13} /> Edit</button>
            ) : (
              <>
                <button onClick={saveDraft} className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-purple-500"><Check size={13} /> Save</button>
                <button onClick={() => setMode('preview')} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/75 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"><Eye size={13} /> Preview</button>
              </>
            )}
            <button onClick={() => setDocumentStatus(incidentId, openDoc.id, openDoc.status === 'finalized' ? 'edited' : 'finalized')} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium ${openDoc.status === 'finalized' ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border border-slate-700 bg-slate-800/75 text-slate-200 hover:bg-slate-700'}`}><Check size={13} /> {openDoc.status === 'finalized' ? 'Finalized' : 'Finalize'}</button>
            <div className="mx-1 h-5 w-px bg-slate-700" />
            <button onClick={() => doExport('pdf')} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/75 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"><Download size={13} /> PDF</button>
            <button onClick={() => doExport('docx')} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/75 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"><FileType size={13} /> DOCX</button>
            <button onClick={() => doExport('print')} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/75 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"><Printer size={13} /> Print</button>
          </div>
        </div>

        {mode === 'edit' ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={26}
            className="w-full resize-y rounded-xl border border-slate-800 bg-slate-950/78 px-4 py-3 font-mono text-xs leading-relaxed text-slate-200 focus:border-purple-600 focus:outline-none"
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/75 p-5">
            <Markdown>{openDoc.content}</Markdown>
          </div>
        )}
      </div>
    )
  }

  // ---- catalog + tracker view --------------------------------------------
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/72 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <FileText size={16} className="text-purple-400" /> AI Document Generator
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Every document auto-fills from the current investigation, narrative, reviewed entities and accepted
          legal sections. Generate, edit, finalize and export.
        </p>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {DOCUMENT_CATALOG.map(({ id, title }) => {
          const existing = byType.get(id)
          return (
            <div key={id} className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/75 p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-slate-100">{title}</span>
                {existing ? (
                  <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11.5px] font-medium ${STATUS_TONE[existing.status] || STATUS_TONE.generated}`}>
                    <Check size={10} /> {existing.status}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800/75 px-1.5 py-0.5 text-[11.5px] text-slate-400">
                    <Clock size={10} /> pending
                  </span>
                )}
              </div>

              <div className="mt-3 flex items-center gap-1.5">
                <button
                  onClick={() => generate(id, title)}
                  disabled={busy === id}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-2.5 py-2 text-xs font-medium text-white transition hover:bg-purple-500 disabled:opacity-50"
                >
                  {busy === id ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                  {existing ? 'Regenerate' : 'Generate'}
                </button>
                {existing && (
                  <>
                    <button onClick={() => open(existing, 'preview')} className="rounded-lg border border-slate-700 bg-slate-800/75 p-2 text-slate-300 hover:bg-slate-700" aria-label="Open"><Eye size={14} /></button>
                    <button onClick={() => removeDocument(incidentId, existing.id)} className="rounded-lg border border-slate-700 bg-slate-800/75 p-2 text-slate-300 hover:bg-slate-700 hover:text-red-400" aria-label="Delete"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Document tracker */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/72 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-200">Document Tracker</h3>
        {docs.length === 0 ? (
          <p className="text-xs text-slate-500">No documents generated yet. {DOCUMENT_CATALOG.length} document types are pending.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/72 text-[12.5px] uppercase tracking-wide text-cyan-300">
                <tr>
                  <th className="text-cyan-300 px-3 py-2">Document</th>
                  <th className="text-cyan-300 px-3 py-2">Status</th>
                  <th className="text-cyan-300 px-3 py-2">Updated</th>
                  <th className="text-cyan-300 px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-t border-slate-800 hover:bg-slate-900/72">
                    <td className="px-3 py-2 text-slate-200">{d.title}</td>
                    <td className="px-3 py-2"><span className={`rounded border px-1.5 py-0.5 text-[11.5px] font-medium ${STATUS_TONE[d.status] || STATUS_TONE.generated}`}>{d.status}</span></td>
                    <td className="px-3 py-2 text-xs text-slate-500">{d.updatedAt ? new Date(d.updatedAt).toLocaleString() : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => open(d, 'preview')} className="rounded p-1 text-slate-400 hover:bg-slate-800/75 hover:text-slate-200" aria-label="Open"><Eye size={14} /></button>
                        <button onClick={() => open(d, 'edit')} className="rounded p-1 text-slate-400 hover:bg-slate-800/75 hover:text-slate-200" aria-label="Edit"><Pencil size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
