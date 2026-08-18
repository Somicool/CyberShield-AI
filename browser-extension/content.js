/**
 * content.js — runs on every page.
 *
 * Two jobs:
 *  1. Show a full-page blocking warning when the background worker flags the
 *     current site as malicious (Go Back / Continue Anyway / Report Website).
 *  2. On the CyberAid web app, bridge the logged-in JWT to the extension
 *     (so reporting works) and expose "installed + stats" to the Guardian page.
 *
 * Not a module (content scripts run in an isolated world); it delegates all
 * backend calls to the background worker via messages.
 */

;(function () {
  const DASHBOARD_HOSTS = ['localhost', '127.0.0.1']

  // ---- 1. Malicious-site warning overlay --------------------------------
  function buildWarning(data) {
    if (document.getElementById('cybershield-guardian-warning')) return

    const overlay = document.createElement('div')
    overlay.id = 'cybershield-guardian-warning'
    overlay.setAttribute('style', [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(2,6,23,0.97)', 'backdrop-filter:blur(4px)',
      'display:flex', 'align-items:center', 'justify-content:center',
      'font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif', 'color:#e2e8f0',
    ].join(';'))

    const card = document.createElement('div')
    card.setAttribute('style', [
      'max-width:520px', 'width:calc(100% - 40px)', 'background:#080b12',
      'border:1px solid rgba(239,68,68,0.5)', 'border-radius:16px', 'padding:28px',
      'box-shadow:0 20px 60px rgba(0,0,0,0.6)',
    ].join(';'))

    const score = Math.round(data.riskScore ?? 0)
    const conf = data.confidence || 'Not Available'
    card.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<span style="font-size:26px">\u26D4</span>' +
      '<h1 style="margin:0;font-size:20px;color:#fca5a5">Dangerous website blocked</h1></div>' +
      '<p style="margin:0 0 14px;font-size:14px;color:#94a3b8">CyberAid Guardian flagged this site as a likely phishing or scam page.</p>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">' +
      cell('Website', escapeHtml(data.host)) +
      cell('Risk Score', score + '/100') +
      cell('Threat Level', escapeHtml((data.threatLevel || 'unknown').toUpperCase())) +
      cell('Confidence', conf) +
      '</div>' +
      '<div style="font-size:12px;color:#64748b;margin-bottom:6px">AI Explanation</div>' +
      '<div id="csg-explanation" style="font-size:13px;line-height:1.5;color:#cbd5e1;background:#0d1420;border:1px solid #1e2635;border-radius:10px;padding:12px;margin-bottom:18px">Loading AI assessment\u2026</div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
      btn('csg-back', 'Go Back', '#2a3444') +
      btn('csg-report', 'Report Website', '#0891b2') +
      btn('csg-continue', 'Continue Anyway', 'transparent', '#64748b') +
      '</div>'

    overlay.appendChild(card)
    document.documentElement.appendChild(overlay)

    document.getElementById('csg-back').onclick = () => {
      if (history.length > 1) history.back()
      else overlay.remove()
    }
    document.getElementById('csg-continue').onclick = () => overlay.remove()
    document.getElementById('csg-report').onclick = () => reportCurrent(data.url)

    // Fetch the full AI explanation lazily (real, from /api/detect).
    chrome.runtime.sendMessage({ type: 'GUARDIAN_ANALYZE', url: data.url }, (resp) => {
      const el = document.getElementById('csg-explanation')
      if (!el) return
      if (resp?.ok && resp.result?.explanation) el.textContent = resp.result.explanation
      else el.textContent = 'A detailed AI assessment is not available right now, but this site matched strong scam indicators.'
    })
  }

  function reportCurrent(url) {
    chrome.runtime.sendMessage({ type: 'GUARDIAN_REPORT', url }, (resp) => {
      const btnEl = document.getElementById('csg-report')
      if (resp?.ok) {
        if (btnEl) { btnEl.textContent = 'Reported \u2713'; btnEl.disabled = true }
      } else if (resp?.error === 'auth') {
        // Not signed in — send them to the citizen report page, prefilled.
        window.open('http://localhost:5173/citizen/report?url=' + encodeURIComponent(url), '_blank')
      } else if (btnEl) {
        btnEl.textContent = 'Report failed'
      }
    })
  }

  function cell(label, value) {
    return (
      '<div style="background:#0d1420;border:1px solid #1e2635;border-radius:10px;padding:10px">' +
      '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#64748b">' + label + '</div>' +
      '<div style="font-size:14px;color:#e2e8f0;margin-top:2px;word-break:break-all">' + value + '</div></div>'
    )
  }
  function btn(id, label, bg, color) {
    return `<button id="${id}" style="flex:1;min-width:120px;cursor:pointer;border:1px solid ${bg === 'transparent' ? '#2a3444' : bg};background:${bg};color:${color || '#fff'};border-radius:10px;padding:10px 14px;font-size:13px;font-weight:600">${label}</button>`
  }
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'GUARDIAN_SHOW_WARNING') buildWarning(msg.data)
  })

  // ---- 2. CyberAid web app bridge ------------------------------------
  const isApp =
    DASHBOARD_HOSTS.includes(location.hostname) ||
    document.querySelector('meta[name="cybershield-guardian-app"]') != null

  if (isApp) {
    // Bridge the JWT the user is logged in with (never a password) so the
    // extension can report on their behalf.
    const syncToken = () => {
      try {
        const token = localStorage.getItem('access_token')
        chrome.storage.local.set({ 'guardian.authToken': token || null })
      } catch { /* ignore */ }
    }

    // Expose "installed + stats" so the Guardian dashboard page can detect us.
    const expose = () => {
      chrome.storage.local.get(['guardian.stats', 'guardian.settings'], (res) => {
        const stats = res['guardian.stats'] || {}
        const settings = res['guardian.settings'] || { protectionEnabled: true }
        const payload = { installed: true, version: chrome.runtime.getManifest().version, stats, settings }
        document.documentElement.setAttribute('data-cybershield-guardian', 'installed')
        document.documentElement.setAttribute('data-guardian-info', JSON.stringify(payload))
        window.postMessage({ source: 'cybershield-guardian', ...payload }, location.origin)
      })
    }

    syncToken()
    expose()
    // Answer explicit requests from the page and refresh on focus.
    window.addEventListener('message', (e) => {
      if (e.source === window && e.data?.source === 'cybershield-guardian-request') {
        syncToken()
        expose()
      }
    })
    window.addEventListener('focus', () => { syncToken(); expose() })
  }
})()
