# MuscleMap

Click a muscle, watch the lift, see exactly where it hits. A static Three.js app: a rigged
athlete performs 23 exercises as looping reps, with a shader-painted muscle impact map,
equipment, tempo control, form cues and common mistakes.

## Run

```sh
python3 -m http.server 4180
```

Then open http://localhost:4180. No build step; Three.js and the models load from CDNs.

## Files

- `index.html`, `styles.css` — layout and design.
- `data.js` — muscle groups, exercise keyframes, cues and camera presets.
- `app.js` — renderer, mannequin posing, heat shader, equipment, UI.

## Attribution

- Mannequin: X Bot from the three.js examples (MIT), a Mixamo character.

This is an educational tool, not medical advice.

## Tracking

Two layers, both anonymous (no cookies, no personal data):

1. **Vercel Web Analytics** — unique visitors, page views, devices, countries. In the Vercel
   project open the *Analytics* tab and click *Enable*. The page already loads the script.
2. **Live and total unique users** — `api/presence.mjs` counts heartbeats in Redis and the app
   shows "N training now · M lifters so far". Setup, once:
   - In the Vercel project go to *Storage* → *Create Database* → **Upstash Redis** (free tier).
     Connecting it adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically.
   - Redeploy. `GET /api/presence` returns `{ live, unique, today }` at any time.

Live = distinct visitors seen in the last 60 seconds. Unique = distinct anonymous ids ever
(HyperLogLog, ±1%). Without the Redis env vars the API returns 503 and the pill stays hidden.
