/**
 * CrimeGPT store — the single source of truth for CrimeGPT-specific case data
 * the detection backend does not persist: the investigation narrative,
 * reviewed entities, accepted legal sections, case-law references, generated
 * documents and the case diary.
 *
 * WHY localStorage (same rationale as caseWorkflow): the detection backend is
 * read-only for incidents and has no case-management schema. Persisting here
 * lets CrimeGPT genuinely work today, keyed per incident. This module is the
 * single seam a future case-management API plugs into — swap load/persist for
 * network calls and every component keeps working.
 *
 * Smart Auto-Fill: because narrative + entities + accepted legal all live in
 * ONE record per case, every generated document and the assistant read the
 * same source. Editing an entity or the narrative updates what the next
 * document/assistant call sees — no duplicate data entry.
 *
 * Exposes a useSyncExternalStore-compatible interface for React re-renders.
 */

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'cybershield.crimegpt.v1'

export const EMPTY_ENTITIES = {
  victims: [],
  suspects: [],
  urls: [],
  domains: [],
  emails: [],
  phone_numbers: [],
  ip_addresses: [],
  wallet_addresses: [],
  bank_accounts: [],
  organizations: [],
  dates: [],
  locations: [],
  financial_amounts: [],
}

const DEFAULT_CASE = {
  narrative: '',
  entities: null, // null until first extraction/seed; then { ...EMPTY_ENTITIES }
  entitiesFinalized: false,
  legalSections: [], // accepted/edited legal sections
  caseLaw: [], // accepted case-law references
  documents: [], // { id, docType, title, content, source, status, createdAt, updatedAt }
  diary: [], // { id, at, kind, text, auto }
  updatedAt: null,
}

let state = load()
const listeners = new Set()

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage full / unavailable — non-fatal for the session */
  }
}

function emit() {
  state = { ...state }
  persist()
  listeners.forEach((l) => l())
}

function subscribe(listener) {
  listeners.add(listener)
  const onStorage = (e) => {
    if (e.key === STORAGE_KEY) {
      state = load()
      listeners.forEach((l) => l())
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

function getSnapshot() {
  return state
}

function rid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

// ---- Reads ---------------------------------------------------------------

export function getCase(id) {
  return { ...DEFAULT_CASE, ...(state[id] || {}) }
}

// ---- Writes --------------------------------------------------------------

function update(id, patch) {
  const current = { ...DEFAULT_CASE, ...(state[id] || {}) }
  state[id] = { ...current, ...patch, updatedAt: new Date().toISOString() }
  emit()
}

export function setNarrative(id, narrative) {
  update(id, { narrative })
}

export function setEntities(id, entities, { finalized } = {}) {
  const patch = { entities: { ...EMPTY_ENTITIES, ...entities } }
  if (typeof finalized === 'boolean') patch.entitiesFinalized = finalized
  update(id, patch)
}

export function updateEntityCategory(id, category, values) {
  const c = getCase(id)
  const entities = { ...EMPTY_ENTITIES, ...(c.entities || {}), [category]: values }
  update(id, { entities })
}

export function setLegalSections(id, legalSections) {
  update(id, { legalSections })
}

export function setCaseLaw(id, caseLaw) {
  update(id, { caseLaw })
}

// ---- Documents -----------------------------------------------------------

/** Adds or replaces a generated document (one live draft per doc type). */
export function saveDocument(id, doc) {
  const c = getCase(id)
  const now = new Date().toISOString()
  const existingIdx = c.documents.findIndex((d) => d.docType === doc.docType && d.id === doc.id)
  let documents
  if (doc.id && existingIdx >= 0) {
    documents = c.documents.map((d) => (d.id === doc.id ? { ...d, ...doc, updatedAt: now } : d))
  } else {
    documents = [
      ...c.documents,
      { id: doc.id || rid('doc'), status: 'generated', createdAt: now, updatedAt: now, ...doc },
    ]
  }
  update(id, { documents })
}

export function updateDocumentContent(id, docId, content) {
  const c = getCase(id)
  const documents = c.documents.map((d) =>
    d.id === docId ? { ...d, content, status: 'edited', updatedAt: new Date().toISOString() } : d
  )
  update(id, { documents })
}

export function setDocumentStatus(id, docId, status) {
  const c = getCase(id)
  const documents = c.documents.map((d) =>
    d.id === docId ? { ...d, status, updatedAt: new Date().toISOString() } : d
  )
  update(id, { documents })
}

export function removeDocument(id, docId) {
  const c = getCase(id)
  update(id, { documents: c.documents.filter((d) => d.id !== docId) })
}

// ---- Case diary ----------------------------------------------------------

export function addDiaryEntry(id, entry) {
  const c = getCase(id)
  const item = {
    id: rid('diary'),
    at: entry.at || new Date().toISOString(),
    kind: entry.kind || 'note',
    text: entry.text || '',
    auto: Boolean(entry.auto),
  }
  update(id, { diary: [...c.diary, item] })
}

/**
 * Records an automatic diary event once per stable key, so re-opening the
 * module never duplicates auto entries. `key` is stored on the entry.
 */
export function logDiaryOnce(id, key, text, at) {
  const c = getCase(id)
  if (c.diary.some((d) => d.key === key)) return
  const item = { id: rid('diary'), key, at: at || new Date().toISOString(), kind: 'event', text, auto: true }
  update(id, { diary: [...c.diary, item] })
}

export function updateDiaryEntry(id, entryId, text) {
  const c = getCase(id)
  update(id, { diary: c.diary.map((d) => (d.id === entryId ? { ...d, text } : d)) })
}

export function removeDiaryEntry(id, entryId) {
  const c = getCase(id)
  update(id, { diary: c.diary.filter((d) => d.id !== entryId) })
}

// ---- React binding -------------------------------------------------------

export function useCrimeGPT() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
