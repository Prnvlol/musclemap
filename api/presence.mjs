// Live and unique user counting. Anonymous client ids only; nothing personal is stored.
// Storage: Upstash Redis over REST (free tier). Env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
//   live   -> sorted set of ids scored by last heartbeat; a user is live if seen in the last 60 s
//   uniq:all, uniq:YYYY-MM-DD -> HyperLogLog counts of distinct ids (all-time, per day)
// POST { id }  registers a heartbeat and returns counts.   GET returns counts only.
const URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const LIVE_WINDOW_MS = 60_000;
const DAY_TTL_S = 60 * 60 * 24 * 45;

async function redis(cmds) {
  const r = await fetch(`${URL}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  const out = await r.json();
  return out.map(x => x.result);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL || !TOKEN) return res.status(503).json({ error: 'analytics not configured' });
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const now = Date.now();
  const day = new Date(now).toISOString().slice(0, 10);
  let id = null;
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body || '{}'); } catch { body = {}; } }
    id = String((body && body.id) || '');
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return res.status(400).json({ error: 'bad id' });
  }
  const cmds = [['ZREMRANGEBYSCORE', 'live', '-inf', String(now - LIVE_WINDOW_MS)]];
  if (id) cmds.push(['ZADD', 'live', String(now), id], ['PFADD', 'uniq:all', id], ['PFADD', `uniq:${day}`, id], ['EXPIRE', `uniq:${day}`, String(DAY_TTL_S)]);
  cmds.push(['ZCARD', 'live'], ['PFCOUNT', 'uniq:all'], ['PFCOUNT', `uniq:${day}`]);
  try {
    const out = await redis(cmds);
    const n = out.length;
    return res.status(200).json({ live: out[n - 3], unique: out[n - 2], today: out[n - 1] });
  } catch (e) {
    return res.status(502).json({ error: 'storage unavailable' });
  }
}
