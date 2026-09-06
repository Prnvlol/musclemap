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
