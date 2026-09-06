// Client side of the tracking: Vercel Web Analytics for the dashboard, and an anonymous
// heartbeat to /api/presence for live and unique counts. Nothing runs on localhost.
const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

export function loadVercelAnalytics() {
  if (isLocal) return;
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  const s = document.createElement('script'); s.defer = true; s.src = '/_vercel/insights/script.js';
  document.head.appendChild(s);
}

export function startPresence(onStats, intervalMs = 45000) {
  if (isLocal) return;
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
