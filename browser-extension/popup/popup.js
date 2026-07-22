/**
 * popup.js — the toolbar popup dashboard.
 *
 * Renders the current site's risk (via the background worker, which calls the
 * real backend), lets the user re-analyze, report the site, open the citizen
 * dashboard, and view/clear local history. No detection logic here.
 */
import { CONFIG, confidenceLabel, isTrustedOrExempt, originOf } from '../utils/api.js'

const $ = (id) => document.getElementById(id)

const el = {
  host: $('site-host'),
  card: $('status-card'),
  loading: $('status-loading'),
  body: $('status-body'),
  error: $('status-error'),
  badge: $('status-badge'),
  score: $('status-score'),
  prediction: $('m-prediction'),
  confidence: $('m-confidence'),
  level: $('m-level'),
  explain: $('explain'),
  analyze: $('btn-analyze'),
  report: $('btn-report'),
  dashboard: $('btn-dashboard'),
  reportNote: $('report-note'),
  toggle: $('protection-toggle'),
  historyList: $('history-list'),
  historyEmpty: $('history-empty'),
  clear: $('btn-clear'),
}

let currentUrl = null
let currentHost = null
let scanTarget = null // the site origin we actually check / report

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve))
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

function showLoading() {
  el.loading.hidden = false
  el.body.hidden = true
  el.error.hidden = true
  el.card.classList.remove('safe', 'malicious')
}

function showError(msg) {
  el.loading.hidden = true
  el.body.hidden = true
  el.error.hidden = false
  el.error.textContent = msg
  el.card.classList.remove('safe', 'malicious')
}

function renderResult(result) {
  el.loading.hidden = true
  el.error.hidden = true
  el.body.hidden = false

  const prediction = result.prediction // 'safe' | 'suspicious' | 'malicious'
  el.card.classList.remove('safe', 'suspicious', 'malicious')
  el.card.classList.add(prediction)

  el.badge.textContent =
    prediction === 'malicious' ? '⛔ Malicious' : prediction === 'suspicious' ? '⚠ Suspicious' : '✓ Safe'
  el.score.textContent = `${Math.round(result.risk_score ?? 0)}/100`
  el.prediction.textContent = prediction
  el.confidence.textContent = confidenceLabel(result.risk_score)
  el.level.textContent = result.threat_level || '—'
  el.explain.textContent = result.explanation || 'No AI explanation available.'
}

/** Neutral state for trusted/local pages that are intentionally not scanned. */
function showTrusted() {
  el.loading.hidden = true
  el.error.hidden = true
  el.body.hidden = false
  el.card.classList.remove('malicious')
  el.card.classList.add('safe')
  el.badge.textContent = '✓ Trusted'
  el.score.textContent = '—'
  el.prediction.textContent = 'trusted'
  el.confidence.textContent = '—'
  el.level.textContent = 'local'
  el.explain.textContent = 'This is a local or CyberShield page, so real-time protection is not applied here.'
  el.report.disabled = true
}

async function analyze() {
  if (!scanTarget) return
  showLoading()
  const resp = await send({ type: 'GUARDIAN_ANALYZE', url: scanTarget })
  if (resp?.ok) {
    renderResult(resp.result)
    loadHistory()
  } else {
    showError(resp?.error === 'unknown' ? 'This page cannot be analyzed.' : (resp?.error || 'Analysis failed.'))
  }
}

async function report() {
  if (!scanTarget) return
  el.report.disabled = true
  const resp = await send({ type: 'GUARDIAN_REPORT', url: scanTarget })
  if (resp?.ok) {
    el.reportNote.hidden = false
    el.reportNote.textContent = `Reported to CyberShield. Reference ${resp.reference}.`
    el.report.textContent = 'Reported ✓'
  } else if (resp?.error === 'auth') {
    el.report.disabled = false
    el.reportNote.hidden = false
    el.reportNote.textContent = 'Please sign in to CyberShield to report. Opening the report page…'
    chrome.tabs.create({ url: `${CONFIG.dashboardUrl}/citizen/report?url=${encodeURIComponent(scanTarget)}` })
  } else {
    el.report.disabled = false
    el.reportNote.hidden = false
    el.reportNote.textContent = 'Could not submit the report. Please try again.'
  }
}

function timeAgo(iso) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

async function loadHistory() {
  const resp = await send({ type: 'GUARDIAN_GET_STATE' })
  if (!resp?.ok) return
  el.toggle.checked = resp.settings.protectionEnabled
  const history = resp.history || []
  el.historyList.innerHTML = ''
  el.historyEmpty.hidden = history.length > 0
  history.slice(0, 25).forEach((h) => {
    const li = document.createElement('li')
    li.className = 'history-item'
    li.innerHTML =
      `<span class="hist-dot ${h.prediction}"></span>` +
      `<span class="hist-host">${h.host || h.url}</span>` +
      `<span class="hist-score">${Math.round(h.riskScore ?? 0)}</span>` +
      `<span class="hist-date">${timeAgo(h.date)}</span>`
    el.historyList.appendChild(li)
  })
}

async function init() {
  const tab = await getActiveTab()
  currentUrl = tab?.url || null
  try {
    currentHost = currentUrl ? new URL(currentUrl).host : null
  } catch {
    currentHost = null
  }
  el.host.textContent = currentHost || 'This page'
  scanTarget = originOf(currentUrl) || currentUrl

  const analyzable = currentUrl && /^https?:/.test(currentUrl)
  if (!analyzable) {
    showError('This page cannot be analyzed (browser or internal page).')
    el.analyze.disabled = true
    el.report.disabled = true
  } else if (isTrustedOrExempt(currentUrl)) {
    // localhost / private IPs / the CyberShield app itself — not scanned.
    showTrusted()
    el.analyze.disabled = true
  } else {
    // Use a fresh context-menu analysis if it matches this site, else analyze now.
    const { 'guardian.lastAnalysis': last } = await chrome.storage.local.get('guardian.lastAnalysis')
    if (last && last.url === scanTarget && Date.now() - last.at < 60000) {
      renderResult(last)
    } else {
      analyze()
    }
  }
  loadHistory()

  el.analyze.onclick = analyze
  el.report.onclick = report
  el.dashboard.onclick = () => chrome.tabs.create({ url: `${CONFIG.dashboardUrl}/citizen` })
  el.clear.onclick = async () => { await send({ type: 'GUARDIAN_CLEAR_HISTORY' }); loadHistory() }
  el.toggle.onchange = () => send({ type: 'GUARDIAN_SET_ENABLED', value: el.toggle.checked })
}

init()
