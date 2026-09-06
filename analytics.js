// Client side of the tracking: Vercel Web Analytics for the dashboard, and an anonymous
// heartbeat to /api/presence for live and unique counts. Nothing runs on localhost.
const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
// Only the production host counts. Preview deployments (musclemap-git-main-*.vercel.app etc.)
// are separate origins and would otherwise show up as extra visitors.
const PROD_HOSTS = ['musclemap-zeta.vercel.app'];
// ?notrack=1 once excludes this browser (your own visits); ?track=1 turns it back on.
const q = new URLSearchParams(location.search);
try { if (q.has('notrack')) localStorage.setItem('mm_notrack', '1'); if (q.has('track')) localStorage.removeItem('mm_notrack'); } catch {}
let optedOut = false; try { optedOut = localStorage.getItem('mm_notrack') === '1'; } catch {}
const isBot = !!navigator.webdriver || /bot|crawl|spider|headless|lighthouse|vercel-screenshot/i.test(navigator.userAgent);
const shouldTrack = !isLocal && !isBot && !optedOut && PROD_HOSTS.includes(location.hostname);

export function loadVercelAnalytics() {
  if (isLocal) return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  const s = document.createElement('script'); s.defer = true; s.src = '/_vercel/insights/script.js';
  document.head.appendChild(s);
}

export function startPresence(onStats, intervalMs = 45000) {
  if (!shouldTrack) return;
  let id;
  try { id = localStorage.getItem('mm_uid'); if (!id) { id = crypto.randomUUID().replace(/-/g, ''); localStorage.setItem('mm_uid', id); } }
  catch { id = crypto.randomUUID().replace(/-/g, ''); }
  let failures = 0, timer = 0;
  const stop = () => { clearInterval(timer); onStats(null); };
  async function beat() {
    if (document.hidden) return;
    try {
      let register = false; try { register = localStorage.getItem('mm_uid_reg') !== id; } catch { register = true; }
      const r = await fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, register }) });
      if (!r.ok) { if (++failures >= 2) stop(); return; }
      failures = 0; if (register) { try { localStorage.setItem('mm_uid_reg', id); } catch {} }
      onStats(await r.json());
    } catch { if (++failures >= 2) stop(); }
  }
  beat(); timer = setInterval(beat, intervalMs);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
}
