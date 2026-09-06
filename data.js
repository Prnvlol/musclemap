// MuscleMap data: muscles are painted as capsules attached to skeleton bones;
// exercises are keyframed bone rotations in the character's body frame.
// Rotation convention: [rx, ry, rz] degrees, Euler XYZ, applied about the
// rest-pose world axes and inherited down the chain. Character faces +Z, left = +X.

export const MODEL_URL = 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/Xbot.glb';

export const GROUPS = [
  { name: 'Upper body', muscles: ['chest', 'shoulders', 'upper_back', 'lats', 'biceps', 'triceps', 'forearms'] },
  { name: 'Core', muscles: ['abs', 'obliques', 'lower_back'] },
  { name: 'Lower body', muscles: ['glutes', 'quads', 'hamstrings', 'calves'] },
];

// Capsules: [bone, ax, ay, az, bx, by, bz, radius] in rest-pose metres, left side; mirrored automatically.
export const MUSCLES = {
  chest:      { name: 'Chest', latin: 'Pectoralis major', caps: [['Spine2', 0.03, 1.40, 0.10, 0.16, 1.42, 0.06, 0.08]] },
  shoulders:  { name: 'Shoulders', latin: 'Deltoids', caps: [['LeftShoulder', 0.15, 1.47, -0.05, 0.20, 1.40, -0.05, 0.075]] },
  biceps:     { name: 'Biceps', latin: 'Biceps brachii', caps: [['LeftArm', 0.21, 1.445, -0.02, 0.40, 1.445, -0.015, 0.05]] },
  triceps:    { name: 'Triceps', latin: 'Triceps brachii', caps: [['LeftArm', 0.21, 1.43, -0.085, 0.40, 1.43, -0.085, 0.05]] },
  forearms:   { name: 'Forearms', latin: 'Flexors and extensors', caps: [['LeftForeArm', 0.46, 1.438, -0.05, 0.68, 1.438, -0.05, 0.05]] },
  abs:        { name: 'Abs', latin: 'Rectus abdominis', caps: [['Spine', 0, 1.31, 0.115, 0, 1.06, 0.10, 0.075]] },
  obliques:   { name: 'Obliques', latin: 'External obliques', caps: [['Spine', 0.135, 1.26, 0.04, 0.15, 1.08, 0.03, 0.06]] },
  upper_back: { name: 'Upper back', latin: 'Trapezius and rhomboids', caps: [['Spine2', 0, 1.50, -0.07, 0, 1.31, -0.11, 0.10], ['Spine2', 0.05, 1.47, -0.06, 0.16, 1.44, -0.08, 0.05]] },
  lats:       { name: 'Lats', latin: 'Latissimus dorsi', caps: [['Spine1', 0.15, 1.36, -0.08, 0.06, 1.12, -0.10, 0.07]] },
  lower_back: { name: 'Lower back', latin: 'Erector spinae', caps: [['Spine', 0, 1.21, -0.10, 0, 1.01, -0.10, 0.075]] },
  glutes:     { name: 'Glutes', latin: 'Gluteus maximus', caps: [['Hips', 0.09, 0.99, -0.10, 0.09, 0.90, -0.09, 0.09]] },
  quads:      { name: 'Quads', latin: 'Quadriceps', caps: [['LeftUpLeg', 0.09, 0.92, 0.075, 0.085, 0.60, 0.06, 0.07]] },
  hamstrings: { name: 'Hamstrings', latin: 'Biceps femoris group', caps: [['LeftUpLeg', 0.09, 0.92, -0.065, 0.085, 0.60, -0.055, 0.065]] },
  calves:     { name: 'Calves', latin: 'Gastrocnemius and soleus', caps: [['LeftLeg', 0.085, 0.48, -0.05, 0.085, 0.20, -0.045, 0.06]] },
};

/* ---------- pose helpers ---------- */
const arms = (rx, ry, rz) => ({ LeftArm: [rx, ry, rz], RightArm: [rx, -ry, -rz] });
const forearms = (rx, ry, rz) => ({ LeftForeArm: [rx, ry, rz], RightForeArm: [rx, -ry, -rz] });
const thighs = (rx, ry = 0, rz = 0) => ({ LeftUpLeg: [rx, ry, rz], RightUpLeg: [rx, -ry, -rz] });
const shins = (rx) => ({ LeftLeg: [rx, 0, 0], RightLeg: [rx, 0, 0] });
const feet = (rx) => ({ LeftFoot: [rx, 0, 0], RightFoot: [rx, 0, 0] });
const spine = (rx, ry = 0, rz = 0) => ({ Spine: [rx, ry, rz] });
const P = (...parts) => Object.assign({}, ...parts);
const K = (t, pose, root = [0, 0, 0], rootRot = [0, 0, 0]) => ({ t, pose, root, rootRot });

const STAND = P(arms(-4, 0, -80), forearms(0, -12, 0));
const SUPINE = [-90, 0, 0];   // lying on back, head toward -Z
const PRONE = [90, 0, 0];     // lying face down, head toward +Z

/* ---------- exercises ---------- */
export const EXERCISES = [
  {
    id: 'bench_press', name: 'Bench Press', equipment: 'Barbell', tempo: 3,
    muscles: { chest: 100, triceps: 60, shoulders: 45 },
    gear: [{ type: 'bench', pos: [0, 0.42, -0.2], size: [0.34, 0.08, 1.3] }, { type: 'barbell' }],
    camera: { az: 55, el: 28, dist: 3.2, target: [0, 0.75, -0.1] },
    keys: [
      K(0, P(arms(0, -70, 0), forearms(0, -4, 0), thighs(9), shins(81)), [0, -0.47, 0], SUPINE),
      K(0.5, P(arms(0, 14, 0), forearms(0, -92, 0), thighs(9), shins(81)), [0, -0.47, 0], SUPINE),
      K(1, P(arms(0, -70, 0), forearms(0, -4, 0), thighs(9), shins(81)), [0, -0.47, 0], SUPINE),
    ],
    cues: ['Shoulder blades pinned back and down into the bench', 'Bar path drifts from nipple line at the bottom to above the shoulders at the top', 'Feet drive into the floor to keep the hips tight'],
    mistakes: ['Flaring elbows to 90 degrees, which loads the shoulder joint', 'Bouncing the bar off the chest'],
  },
  {
    id: 'push_up', name: 'Push-up', equipment: 'Bodyweight', tempo: 2.4,
    muscles: { chest: 90, triceps: 65, shoulders: 45, abs: 35 },
    gear: [{ type: 'mat' }],
    camera: { az: 75, el: 14, dist: 3.4, target: [0, 0.45, 0] },
    anchor: { grip: 'Left', y: 0.02 },
    keys: [
      K(0, P(arms(0, -84, -20), forearms(0, -3, 0), feet(-30)), [0, -0.56, 0], [70, 0, 0]),
      K(0.5, P(arms(0, -22, -14), forearms(0, -96, 0), feet(-30)), [0, -0.78, 0], [78, 0, 0]),
      K(1, P(arms(0, -84, -20), forearms(0, -3, 0), feet(-30)), [0, -0.56, 0], [70, 0, 0]),
    ],
    cues: ['One straight line from heels to head', 'Elbows track back at about 45 degrees, not out to the sides', 'Push the floor away and let the shoulder blades move'],
    mistakes: ['Hips sagging or piking up', 'Head craning forward to fake depth'],
  },
  {
    id: 'overhead_press', name: 'Overhead Press', equipment: 'Barbell', tempo: 3,
    muscles: { shoulders: 100, triceps: 60, upper_back: 30, abs: 25 },
    gear: [{ type: 'barbell' }],
    camera: { az: 32, el: 14, dist: 4.1, target: [0, 1.3, 0] },
    keys: [
      K(0, P(arms(-10, -25, -55), forearms(0, 0, 110)), [0, 0, 0]),
      K(0.5, P(arms(0, -8, 82), forearms(0, 0, 4)), [0, 0, 0]),
      K(1, P(arms(-10, -25, -55), forearms(0, 0, 110)), [0, 0, 0]),
    ],
    cues: ['Squeeze the glutes so the ribs stay down', 'Move the head back, press, then bring the head through', 'Lock out with the bar over the mid-foot'],
    mistakes: ['Arching the lower back to lean under the bar', 'Pressing forward instead of straight up'],
  },
  {
    id: 'lateral_raise', name: 'Lateral Raise', equipment: 'Dumbbells', tempo: 2.6,
    muscles: { shoulders: 100, upper_back: 35 },
    gear: [{ type: 'dumbbells' }],
    camera: { az: 20, el: 14, dist: 3.6, target: [0, 1.15, 0] },
    keys: [
      K(0, P(arms(-6, -8, -82), forearms(0, -10, 0))),
      K(0.5, P(arms(-6, -12, -4), forearms(0, -10, 0))),
      K(1, P(arms(-6, -8, -82), forearms(0, -10, 0))),
    ],
    cues: ['Lead with the elbows, pinkies slightly up at the top', 'Stop at shoulder height; higher is traps, not delts', 'Lower for three seconds, the descent is the work'],
    mistakes: ['Swinging the weight up with the torso', 'Shrugging the shoulders toward the ears'],
  },
  {
    id: 'barbell_curl', name: 'Barbell Curl', equipment: 'Barbell', tempo: 2.6,
    muscles: { biceps: 100, forearms: 55 },
    gear: [{ type: 'barbell' }],
    camera: { az: 40, el: 12, dist: 3.2, target: [0, 1.05, 0.1] },
    keys: [
      K(0, P(arms(-6, 0, -84), forearms(0, -14, 0))),
      K(0.5, P(arms(-14, 0, -84), forearms(0, -138, 0))),
      K(1, P(arms(-6, 0, -84), forearms(0, -14, 0))),
    ],
    cues: ['Elbows pinned to the ribs the whole way', 'Squeeze hard at the top, then control the way down', 'Wrists neutral, not curled back'],
    mistakes: ['Leaning back and swinging the bar', 'Cutting the range short at the bottom'],
  },
  {
    id: 'tricep_pushdown', name: 'Cable Pushdown', equipment: 'Cable', tempo: 2.4,
    muscles: { triceps: 100, forearms: 30 },
    gear: [{ type: 'cable', from: [0, 2.5, 0.75] }, { type: 'handle' }],
    camera: { az: 70, el: 12, dist: 3.2, target: [0, 1.05, 0.1] },
    keys: [
      K(0, P(arms(-16, 0, -84), forearms(0, -104, 0), spine(8))),
      K(0.5, P(arms(-16, 0, -84), forearms(0, -12, 0), spine(8))),
      K(1, P(arms(-16, 0, -84), forearms(0, -104, 0), spine(8))),
    ],
    cues: ['Upper arms stay still; only the forearms move', 'Full lockout, then a slow return to 90 degrees', 'Slight forward lean, chest up'],
    mistakes: ['Elbows drifting forward and turning it into a chest press', 'Using body weight to push the handle down'],
  },
  {
    id: 'overhead_extension', name: 'Overhead Extension', equipment: 'Dumbbells', tempo: 2.8,
    muscles: { triceps: 100, shoulders: 25 },
    gear: [{ type: 'dumbbells' }],
    camera: { az: 60, el: 18, dist: 3.4, target: [0, 1.35, 0] },
    keys: [
      K(0, P(arms(0, 0, 80), forearms(0, 112, 0))),
      K(0.5, P(arms(0, 0, 80), forearms(0, 10, 0))),
      K(1, P(arms(0, 0, 80), forearms(0, 112, 0))),
    ],
    cues: ['Elbows point at the ceiling and stay narrow', 'Stretch the triceps fully behind the head', 'Ribs down; do not arch to get the weight up'],
    mistakes: ['Elbows flaring out as the weight gets heavy', 'Lower back arching into the lift'],
  },
  {
    id: 'crunch', name: 'Crunch', equipment: 'Bodyweight', tempo: 2.4,
    muscles: { abs: 100, obliques: 35 },
    gear: [{ type: 'mat' }],
    camera: { az: 80, el: 22, dist: 3.0, target: [0, 0.3, 0.15] },
    keys: [
      K(0, P(arms(0, -60, 20), forearms(0, -110, 0), thighs(-60), shins(120), { Spine: [0, 0, 0], Spine1: [0, 0, 0] }), [0, -0.92, 0], SUPINE),
      K(0.5, P(arms(0, -60, 20), forearms(0, -110, 0), thighs(-60), shins(120), { Spine: [34, 0, 0], Spine1: [20, 0, 0] }), [0, -0.92, 0], SUPINE),
      K(1, P(arms(0, -60, 20), forearms(0, -110, 0), thighs(-60), shins(120), { Spine: [0, 0, 0], Spine1: [0, 0, 0] }), [0, -0.92, 0], SUPINE),
    ],
    cues: ['Curl the ribs toward the pelvis, not the head toward the knees', 'Exhale fully at the top and hold a beat', 'Lower back stays glued to the floor'],
    mistakes: ['Pulling on the neck with the hands', 'Using momentum instead of the abs'],
  },
  {
    id: 'plank', name: 'High Plank', equipment: 'Bodyweight', tempo: 4,
    muscles: { abs: 100, obliques: 60, shoulders: 40, glutes: 30 },
    gear: [{ type: 'mat' }],
    camera: { az: 85, el: 12, dist: 3.4, target: [0, 0.45, 0] },
    anchor: { grip: 'Left', y: 0.02 },
    keys: [
      K(0, P(arms(0, -84, -20), forearms(0, -3, 0), feet(-30)), [0, -0.56, 0], [70, 0, 0]),
      K(0.5, P(arms(0, -84, -20), forearms(0, -3, 0), feet(-30), spine(-3)), [0, -0.55, 0], [70, 0, 0]),
      K(1, P(arms(0, -84, -20), forearms(0, -3, 0), feet(-30)), [0, -0.56, 0], [70, 0, 0]),
    ],
    cues: ['Tuck the pelvis slightly and squeeze the glutes', 'Push the floor away so the upper back is broad', 'Breathe; a plank is a hold, not a breath hold'],
    mistakes: ['Hips sagging toward the floor', 'Looking up and dropping the head'],
  },
  {
    id: 'russian_twist', name: 'Russian Twist', equipment: 'Bodyweight', tempo: 2.4,
    muscles: { obliques: 100, abs: 60 },
    gear: [{ type: 'mat' }],
    camera: { az: 25, el: 34, dist: 3.2, target: [0, 0.55, 0.2] },
    keys: [
      K(0, P(arms(0, -78, -8), forearms(0, -10, 0), thighs(-105), shins(44), feet(50), spine(-22), { Spine1: [0, 0, 0] }), [0, -0.86, 0]),
      K(0.25, P(arms(0, -78, -8), forearms(0, -10, 0), thighs(-105), shins(44), feet(50), spine(-22), { Spine1: [0, 38, 0] }), [0, -0.86, 0]),
      K(0.5, P(arms(0, -78, -8), forearms(0, -10, 0), thighs(-105), shins(44), feet(50), spine(-22), { Spine1: [0, 0, 0] }), [0, -0.86, 0]),
      K(0.75, P(arms(0, -78, -8), forearms(0, -10, 0), thighs(-105), shins(44), feet(50), spine(-22), { Spine1: [0, -38, 0] }), [0, -0.86, 0]),
      K(1, P(arms(0, -78, -8), forearms(0, -10, 0), thighs(-105), shins(44), feet(50), spine(-22), { Spine1: [0, 0, 0] }), [0, -0.86, 0]),
    ],
    cues: ['Rotate from the ribcage; the hips stay square', 'Tall spine leaning back about 45 degrees', 'Slow and even to both sides'],
    mistakes: ['Just swinging the arms side to side', 'Rounding the lower back'],
  },
  {
    id: 'bent_over_row', name: 'Bent-over Row', equipment: 'Barbell', tempo: 2.8,
    muscles: { upper_back: 100, lats: 80, biceps: 50, lower_back: 35 },
    gear: [{ type: 'barbell' }],
    camera: { az: 65, el: 14, dist: 3.4, target: [0, 0.95, 0.1] },
    keys: [
      K(0, P(arms(-48, 0, -86), forearms(0, -6, 0), thighs(-58), shins(12), spine(6)), [0, -0.1, -0.12], [45, 0, 0]),
      K(0.5, P(arms(14, 0, -86), forearms(0, -110, 0), thighs(-58), shins(12), spine(6)), [0, -0.1, -0.12], [45, 0, 0]),
      K(1, P(arms(-48, 0, -86), forearms(0, -6, 0), thighs(-58), shins(12), spine(6)), [0, -0.1, -0.12], [45, 0, 0]),
    ],
    cues: ['Hinge to about 45 degrees and hold that angle', 'Pull the bar to the lower ribs, elbows past the torso', 'Pause, squeeze the shoulder blades, lower under control'],
    mistakes: ['Torso bobbing up to meet the bar', 'Rounding the back as fatigue sets in'],
  },
  {
    id: 'face_pull', name: 'Face Pull', equipment: 'Cable', tempo: 2.6,
    muscles: { upper_back: 100, shoulders: 65 },
    gear: [{ type: 'cable', from: [0, 1.7, 1.6] }, { type: 'handle' }],
    camera: { az: 35, el: 14, dist: 3.4, target: [0, 1.25, 0.2] },
    keys: [
      K(0, P(arms(0, -84, 4), forearms(0, -6, 0))),
      K(0.5, P(arms(0, -18, 0), forearms(0, -112, 0))),
      K(1, P(arms(0, -84, 4), forearms(0, -6, 0))),
    ],
    cues: ['Pull to the bridge of the nose, elbows high and wide', 'Finish with thumbs pointing back, like a double biceps pose', 'Light weight, perfect control'],
    mistakes: ['Leaning back to move heavier weight', 'Elbows dropping so it becomes a row'],
  },
  {
    id: 'pull_up', name: 'Pull-up', equipment: 'Bar', tempo: 3,
    muscles: { lats: 100, upper_back: 70, biceps: 60, forearms: 40 },
    gear: [{ type: 'pullup_bar', y: 2.3 }],
    camera: { az: 35, el: 8, dist: 4.2, target: [0, 1.5, 0] },
    anchor: { grip: 'Left', y: 2.3 },
    keys: [
      K(0, P(arms(0, 0, 72), forearms(0, 0, 2), shins(18)), [0, 0.3, 0]),
      K(0.5, P(arms(0, 0, -10), forearms(0, 0, 118), shins(18)), [0, 0.7, 0]),
      K(1, P(arms(0, 0, 72), forearms(0, 0, 2), shins(18)), [0, 0.3, 0]),
    ],
    cues: ['Start the pull by depressing the shoulder blades', 'Drive the elbows down and back toward the hips', 'Chin over the bar, then a full hang at the bottom'],
    mistakes: ['Kipping with the legs', 'Half reps that never reach a dead hang'],
  },
  {
    id: 'lat_pulldown', name: 'Lat Pulldown', equipment: 'Cable', tempo: 2.8,
    muscles: { lats: 100, upper_back: 60, biceps: 55 },
    gear: [{ type: 'bench', pos: [0, 0.45, -0.1], size: [0.42, 0.06, 0.4] }, { type: 'cable', from: [0, 2.7, 0.15] }, { type: 'barbell', short: true }],
    camera: { az: 30, el: 12, dist: 3.6, target: [0, 1.1, 0] },
    keys: [
      K(0, P(arms(0, -8, 82), forearms(0, 0, 2), thighs(-90), shins(84), spine(-8)), [0, -0.46, 0]),
      K(0.5, P(arms(0, -30, -38), forearms(0, 0, 112), thighs(-90), shins(84), spine(-8)), [0, -0.46, 0]),
      K(1, P(arms(0, -8, 82), forearms(0, 0, 2), thighs(-90), shins(84), spine(-8)), [0, -0.46, 0]),
    ],
    cues: ['Slight lean back, chest up toward the bar', 'Pull the elbows into the back pockets', 'Let the shoulder blades rise fully at the top'],
    mistakes: ['Pulling with the arms and swinging the torso', 'Bar travelling behind the neck'],
  },
  {
    id: 'deadlift', name: 'Deadlift', equipment: 'Barbell', tempo: 3.2,
    muscles: { lower_back: 100, glutes: 90, hamstrings: 85, quads: 55, upper_back: 50, forearms: 40 },
    gear: [{ type: 'barbell' }],
    camera: { az: 60, el: 12, dist: 3.8, target: [0, 0.85, 0.1] },
    keys: [
      K(0, P(arms(-80, 0, -88), forearms(0, -2, 0), thighs(-109), shins(46), feet(13), spine(18)), [0, -0.32, -0.18], [50, 0, 0]),
      K(0.55, P(arms(-12, 0, -88), forearms(0, -2, 0), thighs(0), shins(0), spine(0)), [0, 0, 0], [0, 0, 0]),
      K(1, P(arms(-80, 0, -88), forearms(0, -2, 0), thighs(-109), shins(46), feet(13), spine(18)), [0, -0.32, -0.18], [50, 0, 0]),
    ],
    cues: ['Bar over mid-foot, shins touching it, lats tight', 'Push the floor away; hips and shoulders rise together', 'Stand tall and lock the glutes, no lean back'],
    mistakes: ['Rounding the lower back off the floor', 'Hips shooting up first and turning it into a stiff-leg pull'],
  },
  {
    id: 'romanian_deadlift', name: 'Romanian Deadlift', equipment: 'Barbell', tempo: 3.2,
    muscles: { hamstrings: 100, glutes: 85, lower_back: 60, forearms: 25 },
    gear: [{ type: 'barbell' }],
    camera: { az: 70, el: 12, dist: 3.6, target: [0, 0.9, 0] },
    keys: [
      K(0, P(arms(-12, 0, -88), forearms(0, -2, 0))),
      K(0.5, P(arms(-72, 0, -88), forearms(0, -2, 0), thighs(-120), shins(50), feet(0), spine(4)), [0, -0.23, -0.19], [70, 0, 0]),
      K(1, P(arms(-12, 0, -88), forearms(0, -2, 0))),
    ],
    cues: ['Push the hips back as if closing a car door', 'Soft knees, bar sliding down the thighs', 'Stop when the hamstrings are fully loaded, not when the bar hits the floor'],
    mistakes: ['Bending the knees and squatting the weight', 'Rounding the upper back to reach lower'],
  },
  {
    id: 'squat', name: 'Back Squat', equipment: 'Barbell', tempo: 3.2,
    muscles: { quads: 100, glutes: 85, hamstrings: 50, lower_back: 45, abs: 35 },
    gear: [{ type: 'barbell' }],
    camera: { az: 50, el: 12, dist: 3.8, target: [0, 0.9, 0] },
    keys: [
      K(0, P(arms(34, 0, -44), forearms(0, 0, 102)), [0, 0, 0]),
      K(0.5, P(arms(34, 0, -44), forearms(0, 0, 102), thighs(-118), shins(76), feet(20), spine(10)), [0, -0.5, -0.26], [24, 0, 0]),
      K(1, P(arms(34, 0, -44), forearms(0, 0, 102)), [0, 0, 0]),
    ],
    cues: ['Brace, then break at the hips and knees together', 'Knees track over the toes, chest stays proud', 'Drive up through the whole foot'],
    mistakes: ['Knees caving inward at the bottom', 'Heels lifting as the hips drop'],
  },
  {
    id: 'lunge', name: 'Forward Lunge', equipment: 'Dumbbells', tempo: 3,
    muscles: { quads: 100, glutes: 85, hamstrings: 45, calves: 25 },
    gear: [{ type: 'dumbbells' }],
    camera: { az: 70, el: 12, dist: 3.8, target: [0, 0.8, 0.15] },
    keys: [
      K(0, P(arms(0, 0, -84), forearms(0, -6, 0))),
      K(0.5, P(arms(0, 0, -84), forearms(0, -6, 0), { LeftUpLeg: [-88, 0, 0], LeftLeg: [88, 0, 0], RightUpLeg: [22, 0, 0], RightLeg: [76, 0, 0], RightFoot: [-70, 0, 0] }), [0, -0.42, 0.12]),
      K(1, P(arms(0, 0, -84), forearms(0, -6, 0))),
    ],
    cues: ['Step long enough that the front shin stays vertical', 'Drop the back knee straight down, not forward', 'Torso tall; drive back through the front heel'],
    mistakes: ['Front knee drifting inward', 'Short steps that turn it into a knee-dominant squat'],
  },
  {
    id: 'leg_extension', name: 'Leg Extension', equipment: 'Machine', tempo: 2.6,
    muscles: { quads: 100 },
    gear: [{ type: 'bench', pos: [0, 0.45, -0.08], size: [0.42, 0.06, 0.5] }],
    camera: { az: 85, el: 12, dist: 3.4, target: [0, 0.7, 0.2] },
    keys: [
      K(0, P(arms(-10, 0, -75), forearms(0, -70, 0), thighs(-90), shins(92), feet(20)), [0, -0.46, 0]),
      K(0.5, P(arms(-10, 0, -75), forearms(0, -70, 0), thighs(-90), shins(6), feet(20)), [0, -0.46, 0]),
      K(1, P(arms(-10, 0, -75), forearms(0, -70, 0), thighs(-90), shins(92), feet(20)), [0, -0.46, 0]),
    ],
    cues: ['Hips stay planted, hands on the seat handles', 'Pause hard at full extension', 'Lower for twice as long as you lift'],
    mistakes: ['Kicking the pad up with momentum', 'Letting the weight slam down at the bottom'],
  },
  {
    id: 'hip_thrust', name: 'Hip Thrust', equipment: 'Barbell', tempo: 2.8,
    muscles: { glutes: 100, hamstrings: 45, quads: 25 },
    gear: [{ type: 'bench', pos: [0, 0.22, -0.55], size: [0.7, 0.44, 0.34] }, { type: 'barbell_hips' }],
    camera: { az: 80, el: 16, dist: 3.4, target: [0, 0.45, -0.1] },
    keys: [
      K(0, P(arms(-4, 0, -74), forearms(0, -30, 0), thighs(-82), shins(116), feet(7)), [0, -0.81, 0], [-45, 0, 0]),
      K(0.5, P(arms(-4, 0, -74), forearms(0, -30, 0), thighs(-10), shins(86), feet(0)), [0, -0.57, 0], [-80, 0, 0]),
      K(1, P(arms(-4, 0, -74), forearms(0, -30, 0), thighs(-82), shins(116), feet(7)), [0, -0.81, 0], [-45, 0, 0]),
    ],
    cues: ['Chin tucked, ribs down, eyes forward', 'Drive through the heels until the shins are vertical', 'Squeeze the glutes at the top for a full second'],
    mistakes: ['Arching the lower back to get higher', 'Feet too far out so the hamstrings take over'],
  },
  {
    id: 'calf_raise', name: 'Standing Calf Raise', equipment: 'Bodyweight', tempo: 2.4,
    muscles: { calves: 100 },
    gear: [],
    camera: { az: 75, el: 4, dist: 3.0, target: [0, 0.5, 0] },
    keys: [
      K(0, P(STAND), [0, 0, 0]),
      K(0.5, P(STAND, feet(36)), [0, 0.09, 0]),
      K(1, P(STAND), [0, 0, 0]),
    ],
    cues: ['Rise as high as possible onto the big toes', 'Pause at the top, then lower slowly into a stretch', 'Knees straight but not locked'],
    mistakes: ['Bouncing out of the bottom', 'Rolling onto the outside of the feet'],
  },
  {
    id: 'leg_curl', name: 'Lying Leg Curl', equipment: 'Machine', tempo: 2.6,
    muscles: { hamstrings: 100, calves: 30, glutes: 25 },
    gear: [{ type: 'bench', pos: [0, 0.4, 0.14], size: [0.5, 0.08, 1.12] }],
    camera: { az: 80, el: 20, dist: 3.4, target: [0, 0.6, 0] },
    keys: [
      K(0, P(arms(0, -50, 50), forearms(0, -100, 0), thighs(-5), shins(2)), [0, -0.49, 0], PRONE),
      K(0.5, P(arms(0, -50, 50), forearms(0, -100, 0), thighs(-5), shins(112)), [0, -0.49, 0], PRONE),
      K(1, P(arms(0, -50, 50), forearms(0, -100, 0), thighs(-5), shins(2)), [0, -0.49, 0], PRONE),
    ],
    cues: ['Hips pressed into the pad the whole time', 'Curl to full contraction, heels to glutes', 'Lower slowly, feel the stretch at the bottom'],
    mistakes: ['Hips lifting off the pad to cheat the weight up', 'Letting the pad drop fast'],
  },
  {
    id: 'back_extension', name: 'Back Extension', equipment: 'Bench', tempo: 3,
    muscles: { lower_back: 100, glutes: 60, hamstrings: 50 },
    gear: [{ type: 'bench', pos: [0, 0.5, -0.35], size: [0.5, 0.1, 0.6] }],
    camera: { az: 85, el: 14, dist: 3.4, target: [0, 0.8, 0.1] },
    keys: [
      K(0, P(arms(-60, 0, -60), forearms(0, -100, 0), thighs(-6), { Spine: [46, 0, 0], Spine1: [18, 0, 0] }), [0, -0.39, 0], PRONE),
      K(0.5, P(arms(-60, 0, -60), forearms(0, -100, 0), thighs(-6), { Spine: [-12, 0, 0], Spine1: [-6, 0, 0] }), [0, -0.39, 0], PRONE),
      K(1, P(arms(-60, 0, -60), forearms(0, -100, 0), thighs(-6), { Spine: [46, 0, 0], Spine1: [18, 0, 0] }), [0, -0.39, 0], PRONE),
    ],
    cues: ['Hinge at the hips with a neutral spine', 'Come up to a straight line, not beyond it', 'Squeeze the glutes at the top'],
    mistakes: ['Hyperextending at the top', 'Jerking up with momentum'],
  },
];

export const IDLE = STAND;
