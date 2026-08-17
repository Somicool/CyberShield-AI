/**
 * Case workflow store — the mutable investigation state the backend does
 * not (yet) persist: status, assigned officer, and timeline stamps.
 *
 * WHY localStorage: the detection backend is read-only for incidents and has
 * no case-management schema. Rather than fake these fields or block the
 * feature, we persist officer actions locally so the workspace genuinely
 * works today. This whole module is the single seam a future
 * case-management API plugs into — swap the load/persist functions for
 * network calls and every component keeps working unchanged.
 *
 * Exposes a `useSyncExternalStore`-compatible interface so React components
 * re-render when case state changes (including across browser tabs).
 */

import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'cybershield.caseWorkflow.v1'

const DEFAULT_META = {
  status: 'open',
  assignedOfficer: null,
  updatedAt: null,
  timeline: {}, // { [stepKey]: ISOString }
  notes: '', // officer investigation notes (frontend-persisted)
  evidence: [], // evidence-vault items (see lib/evidence.js for shape)
}

// Timeline steps a status transition stamps automatically.
const STATUS_TIMELINE_KEY = {
  investigating: 'investigation',
  evidence_pending: 'evidence',
  resolved: 'review',
  closed: 'closed',
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
  // Replace the top-level reference so useSyncExternalStore sees a change.
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

// ---- Reads ---------------------------------------------------------------

export function getCaseMeta(id) {
  return { ...DEFAULT_META, ...(state[id] || {}) }
}

// ---- Writes --------------------------------------------------------------

function update(id, patch) {
  const current = { ...DEFAULT_META, ...(state[id] || {}) }
  state[id] = { ...current, ...patch, updatedAt: new Date().toISOString() }
  emit()
}

export function setStatus(id, status) {
  const meta = getCaseMeta(id)
  const timeline = { ...meta.timeline }
  const stepKey = STATUS_TIMELINE_KEY[status]
  if (stepKey && !timeline[stepKey]) {
    timeline[stepKey] = new Date().toISOString()
  }
  update(id, { status, timeline })
}

export function assignOfficer(id, officerName) {
  update(id, { assignedOfficer: officerName })
}

export function stampTimeline(id, stepKey) {
  const meta = getCaseMeta(id)
  if (meta.timeline[stepKey]) return
  update(id, { timeline: { ...meta.timeline, [stepKey]: new Date().toISOString() } })
}

export function setNotes(id, notes) {
  update(id, { notes })
}

/** Purge local workflow state for a case that has been deleted server-side. */
export function removeCase(id) {
  if (!(id in state)) return
  delete state[id]
  emit()
}

// ---- Evidence vault ------------------------------------------------------

export function getEvidence(id) {
  return getCaseMeta(id).evidence || []
}

export function addEvidence(id, item) {
  const evidence = getEvidence(id)
  update(id, { evidence: [...evidence, item] })
}

export function removeEvidence(id, evidenceId) {
  const evidence = getEvidence(id).filter((e) => e.id !== evidenceId)
  update(id, { evidence })
}

/**
 * Adds auto-derived artifacts once. Items already recorded (matched by their
 * stable `key`) are skipped so re-opening a case never duplicates evidence.
 */
export function seedEvidence(id, items) {
  if (!items?.length) return
  const existing = getEvidence(id)
  const existingKeys = new Set(existing.map((e) => e.key).filter(Boolean))
  const additions = items.filter((it) => it.key && !existingKeys.has(it.key))
  if (!additions.length) return
  update(id, { evidence: [...existing, ...additions] })
}

// Bulk operations reuse the single-item writers.
export function bulkSetStatus(ids, status) {
  ids.forEach((id) => setStatus(id, status))
}

export function bulkAssignOfficer(ids, officerName) {
  ids.forEach((id) => assignOfficer(id, officerName))
}

// ---- React binding -------------------------------------------------------

/**
 * Returns the whole workflow map and re-renders on any change. Read a single
 * case with getCaseMeta(id); the returned `version` object identity changes
 * on every mutation so memoised derivations can depend on it.
 */
export function useCaseWorkflow() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)
  return snapshot
}
