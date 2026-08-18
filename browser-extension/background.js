/**
 * background.js — CyberAid Guardian service worker (Manifest V3).
 *
 * Responsibilities:
 *  - Real-time protection: scan each navigated URL via /api/detect/scan and, if
 *    malicious, tell the page's content script to show a blocking warning.
 *  - Right-click "Analyze with CyberAid" context menu.
 *  - Toolbar badge reflecting the last result.
 *  - Message hub for the popup / content script (analyze, report, state).
 *
 * No detection logic lives here — everything calls the existing backend.
 */
import { scanUrl, analyzeUrl, reportWebsite, verdictFromLevel, confidenceLabel, isTrustedOrExempt, originOf } from './utils/api.js'
import { getSettings, getStats, getHistory, clearHistory, recordScan, getToken, setProtectionEnabled } from './utils/storage.js'

const SKIP_SCHEMES = ['chrome:', 'edge:', 'about:', 'chrome-extension:', 'moz-extension:', 'view-source:', 'file:', 'data:']

function scannable(url) {
  if (!url) return false
  try {
    const u = new URL(url)
    if (SKIP_SCHEMES.some((s) => url.startsWith(s))) return false
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
    // Never scan/warn on the CyberAid app itself, localhost or private IPs.
    if (isTrustedOrExempt(url)) return false
    return true
  } catch {
    return false
  }
}

function hostOf(url) {
  try { return new URL(url).host } catch { return url }
}

async function setBadge(tabId, verdict) {
  try {
    if (verdict === 'malicious') {
      await chrome.action.setBadgeText({ tabId, text: '!' })
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#ef4444' })
    } else if (verdict === 'suspicious') {
      await chrome.action.setBadgeText({ tabId, text: '?' })
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#f59e0b' })
    } else if (verdict === 'safe') {
      await chrome.action.setBadgeText({ tabId, text: '\u2713' })
      await chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' })
    } else {
      await chrome.action.setBadgeText({ tabId, text: '' })
    }
  } catch {
    /* tab may have closed */
  }
}

// ---- context menu --------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'cybershield-analyze',
    title: 'Analyze with CyberAid',
    contexts: ['link', 'page', 'selection'],
  })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'cybershield-analyze') return
  const url = info.linkUrl || info.selectionText || info.pageUrl || tab?.url
  if (!scannable(url)) return
  try {
    const result = await analyzeUrl(url)
    const prediction = verdictFromLevel(result.threat_level)
    // Stash so the popup can display the analysis, then open it.
    await chrome.storage.local.set({ 'guardian.lastAnalysis': { ...result, url, prediction, at: Date.now() } })
    await recordScan({ url, host: hostOf(url), prediction, riskScore: result.risk_score })
    if (tab?.id != null) setBadge(tab.id, prediction)
    try { await chrome.action.openPopup() } catch { /* not always allowed */ }
    if (prediction === 'malicious') {
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'CyberAid Guardian — Threat detected',
        message: `${hostOf(url)} scored ${Math.round(result.risk_score)}/100. Open the popup for details.`,
      })
    }
  } catch (e) {
    console.warn('Analyze failed', e)
  }
})

// ---- real-time navigation protection ------------------------------------
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !scannable(tab?.url)) return
  const { protectionEnabled } = await getSettings()
  if (!protectionEnabled) return

  try {
    // Check the site origin, not the full path/query (avoids false positives
    // on long but legitimate URLs like search results).
    const target = originOf(tab.url) || tab.url
    const result = await scanUrl(target)
    const verdict = verdictFromLevel(result.threat_level)
    await recordScan({ url: target, host: hostOf(tab.url), prediction: verdict, riskScore: result.risk_score })
    setBadge(tabId, verdict)

    if (verdict === 'malicious') {
      // High-confidence malicious → full blocking warning page.
      chrome.tabs.sendMessage(tabId, {
        type: 'GUARDIAN_SHOW_WARNING',
        data: {
          url: target,
          host: hostOf(tab.url),
          riskScore: result.risk_score,
          threatLevel: result.threat_level,
          confidence: confidenceLabel(result.risk_score),
        },
      }).catch(() => {})
    } else if (verdict === 'suspicious') {
      // Uncertain → non-blocking caution notification only (no overlay).
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'CyberAid Guardian — Caution',
        message: `${hostOf(tab.url)} looks suspicious (risk ${Math.round(result.risk_score)}/100). Proceed carefully.`,
      })
    }
  } catch (e) {
    console.warn('Scan failed', e)
  }
})

// ---- message hub ---------------------------------------------------------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  ;(async () => {
    try {
      switch (msg?.type) {
        case 'GUARDIAN_ANALYZE': {
          const result = await analyzeUrl(msg.url)
          const prediction = verdictFromLevel(result.threat_level)
          await recordScan({ url: msg.url, host: hostOf(msg.url), prediction, riskScore: result.risk_score })
          sendResponse({ ok: true, result: { ...result, prediction, confidence: confidenceLabel(result.risk_score) } })
          break
        }
        case 'GUARDIAN_REPORT': {
          const token = await getToken()
          if (!token) { sendResponse({ ok: false, error: 'auth' }); break }
          const res = await reportWebsite({ url: msg.url, description: msg.description }, token)
          sendResponse({ ok: true, reference: res.reference })
          break
        }
        case 'GUARDIAN_GET_STATE': {
          const [settings, stats, history] = await Promise.all([getSettings(), getStats(), getHistory()])
          sendResponse({ ok: true, settings, stats, history })
          break
        }
        case 'GUARDIAN_SET_ENABLED': {
          const s = await setProtectionEnabled(msg.value)
          sendResponse({ ok: true, settings: s })
          break
        }
        case 'GUARDIAN_CLEAR_HISTORY': {
          await clearHistory()
          sendResponse({ ok: true })
          break
        }
        default:
          sendResponse({ ok: false, error: 'unknown' })
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message || 'error' })
    }
  })()
  return true // async response
})
