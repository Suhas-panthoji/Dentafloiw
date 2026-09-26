/**
 * Tooth outlines for the odontogram, generated from average anatomical
 * dimensions (mm) instead of hand-written coordinates.
 *
 * Every shape is built in one canonical orientation:
 *   - x = 0 is the tooth's long axis, +x is MESIAL, -x is DISTAL
 *   - y = 0 is the occlusal / incisal edge, y grows towards the root apex
 *   - the crown spans y = 0 … H, the root spans y = H … H + R
 *
 * The chart flips upper teeth vertically (roots up) and mirrors the
 * patient's left side horizontally (mesial always faces the midline).
 */

// Root lengths are shortened slightly so the chart stays compact.
const ROOT_SCALE = 0.85;

const r2 = (n) => Math.round(n * 100) / 100;

function unit(dx, dy) {
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

// Smooth spline through the points, emitted as cubic Bézier segments. Handle
// lengths follow each segment's length, so unevenly spaced points don't overshoot.
function catmullRom(pts) {
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 3;
    const t1 = unit(p2[0] - p0[0], p2[1] - p0[1]);
    const t2 = unit(p3[0] - p1[0], p3[1] - p1[1]);
    const c1x = p1[0] + t1[0] * seg;
    const c1y = p1[1] + t1[1] * seg;
    const c2x = p2[0] - t2[0] * seg;
    const c2y = p2[1] - t2[1] * seg;
    d += ` C${r2(c1x)} ${r2(c1y)} ${r2(c2x)} ${r2(c2y)} ${r2(p2[0])} ${r2(p2[1])}`;
  }
  return d;
}

// Smooth curve through the points; a point with a third element "c" is a sharp corner.
function smooth(points) {
  let d = "";
  let run = [points[0]];
  for (let i = 1; i < points.length; i++) {
    run.push(points[i]);
    if (points[i][2] === "c" && i < points.length - 1) {
      d += catmullRom(run);
      run = [points[i]];
    }
  }
  return d + catmullRom(run);
}

const move = (p) => `M${r2(p[0])} ${r2(p[1])}`;
const openPath = (points) => move(points[0]) + smooth(points);

// Cemento-enamel junction: a shallow curve dipping towards the root.
function cejCurve(from, to, H, dip) {
  const k = H + dip / 0.75;
  return ` C${r2(from[0] * 0.5)} ${r2(k)} ${r2(to[0] * 0.5)} ${r2(k)} ${r2(to[0])} ${r2(to[1])}`;
}

// Widen roots progressively towards the apex (splayed primary-molar roots).
function flareRoots(points, H, R, flare) {
  if (!flare) return points;
  return points.map(([x, y, c]) => {
    const t = Math.max(0, (y - H) / R);
    return [x * (1 + flare * t), y, c];
  });
}

// ─── Crown outlines (distal cervical → occlusal → mesial cervical) ─────
function incisorCrown(W, Wc, H, { symmetric }) {
  // Upper incisors have a rounder distal-incisal angle than mesial; lower ones are symmetric.
  const distal = symmetric
    ? [[-W * 0.5, H * 0.22], [-W * 0.48, H * 0.06], [-W * 0.4, 0]]
    : [[-W * 0.5, H * 0.3], [-W * 0.46, H * 0.1], [-W * 0.32, H * 0.005]];
  return [
    [-Wc / 2, H],
    [-W * 0.47, H * 0.62],
    ...distal,
    [0, 0],
    [W * 0.4, 0],
    [W * 0.48, H * 0.05],
    [W * 0.5, H * 0.2],
    [W * 0.47, H * 0.6],
    [Wc / 2, H],
  ];
}

function canineCrown(W, Wc, H) {
  return [
    [-Wc / 2, H],
    [-W * 0.47, H * 0.64],
    [-W * 0.5, H * 0.4],
    [-W * 0.33, H * 0.19],
    [-W * 0.09, H * 0.035],
    [W * 0.04, 0],
    [W * 0.15, H * 0.04],
    [W * 0.36, H * 0.14],
    [W * 0.5, H * 0.28],
    [W * 0.47, H * 0.62],
    [Wc / 2, H],
  ];
}

function premolarCrown(W, Wc, H) {
  return [
    [-Wc / 2, H],
    [-W * 0.46, H * 0.66],
    [-W * 0.5, H * 0.4],
    [-W * 0.42, H * 0.18],
    [-W * 0.2, H * 0.05],
    [W * 0.02, 0],
    [W * 0.22, H * 0.05],
    [W * 0.43, H * 0.17],
    [W * 0.5, H * 0.36],
    [W * 0.46, H * 0.64],
    [Wc / 2, H],
  ];
}

function twoCuspCrown(W, Wc, H) {
  return [
    [-Wc / 2, H],
    [-W * 0.49, H * 0.66],
    [-W * 0.5, H * 0.38],
    [-W * 0.47, H * 0.14],
    [-W * 0.37, H * 0.03],
    [-W * 0.22, 0],
    [-W * 0.08, H * 0.05],
    [0, H * 0.12, "c"],
    [W * 0.1, H * 0.04],
    [W * 0.26, 0],
    [W * 0.4, H * 0.03],
    [W * 0.49, H * 0.13],
    [W * 0.5, H * 0.3],
    [W * 0.48, H * 0.62],
    [Wc / 2, H],
  ];
}

function threeCuspCrown(W, Wc, H) {
  return [
    [-Wc / 2, H],
    [-W * 0.48, H * 0.66],
    [-W * 0.5, H * 0.38],
    [-W * 0.46, H * 0.15],
    [-W * 0.35, H * 0.04],
    [-W * 0.24, H * 0.13, "c"],
    [-W * 0.1, H * 0.02],
    [W * 0.04, H * 0.15, "c"],
    [W * 0.2, 0],
    [W * 0.4, H * 0.07],
    [W * 0.5, H * 0.28],
    [W * 0.48, H * 0.6],
    [Wc / 2, H],
  ];
}

// ─── Root outlines (mesial cervical → apices → distal cervical) ────────
function singleRoot(Wc, H, R) {
  return [
    [Wc / 2, H],
    [Wc * 0.47, H + R * 0.25],
    [Wc * 0.38, H + R * 0.6],
    [Wc * 0.2, H + R * 0.9],
    [-Wc * 0.05, H + R],
    [-Wc * 0.27, H + R * 0.9],
    [-Wc * 0.42, H + R * 0.6],
    [-Wc * 0.48, H + R * 0.25],
    [-Wc / 2, H],
  ];
}

function bifidRoot(Wc, H, R) {
  return [
    [Wc / 2, H],
    [Wc * 0.47, H + R * 0.3],
    [Wc * 0.4, H + R * 0.62],
    [Wc * 0.3, H + R * 0.88],
    [Wc * 0.14, H + R * 0.99],
    [Wc * 0.02, H + R * 0.82, "c"],
    [-Wc * 0.12, H + R * 0.97],
    [-Wc * 0.3, H + R * 0.86],
    [-Wc * 0.42, H + R * 0.6],
    [-Wc * 0.48, H + R * 0.28],
    [-Wc / 2, H],
  ];
}

// Two roots seen from the buccal side; `close` pulls them together (second molars).
function twoRoots(Wc, H, R, close = 0) {
  const inner = 1 - close * 0.6;
  const furcation = H + R * (0.26 + close * 0.14);
  return [
    [Wc / 2, H],
    [Wc * 0.52, H + R * 0.22],
    [Wc * 0.49, H + R * 0.5],
    [Wc * 0.38, H + R * 0.82],
    [Wc * 0.22, H + R * 0.99],
    [Wc * 0.1 * inner, H + R * 0.87],
    [Wc * 0.12 * inner, H + R * 0.58],
    [Wc * 0.09 * inner, furcation + R * 0.08],
    [0, furcation],
    [-Wc * 0.11 * inner, furcation + R * 0.08],
    [-Wc * 0.15 * inner, H + R * 0.55],
    [-Wc * 0.22 * inner, H + R * 0.8],
    [-Wc * 0.34, H + R * 0.93],
    [-Wc * 0.46, H + R * 0.74],
    [-Wc * 0.5, H + R * 0.44],
    [-Wc * 0.51, H + R * 0.18],
    [-Wc / 2, H],
  ];
}

function fusedRoot(Wc, H, R) {
  return [
    [Wc / 2, H],
    [Wc * 0.47, H + R * 0.3],
    [Wc * 0.32, H + R * 0.7],
    [Wc * 0.08, H + R * 0.98],
    [-Wc * 0.14, H + R * 0.95],
    [-Wc * 0.34, H + R * 0.66],
    [-Wc * 0.47, H + R * 0.28],
    [-Wc / 2, H],
  ];
}

// Palatal root of upper molars, partly visible behind the buccal roots.
function palatalRoot(Wc, H, R) {
  return [
    [-Wc * 0.2, H + R * 0.15],
    [-Wc * 0.17, H + R * 0.62],
    [-Wc * 0.07, H + R * 0.95],
    [Wc * 0.03, H + R * 1.02],
    [Wc * 0.12, H + R * 0.9],
    [Wc * 0.17, H + R * 0.6],
    [Wc * 0.19, H + R * 0.15],
  ];
}

// ─── Tooth type catalogue: [crownWidth, cervicalWidth, crownHeight, rootLength] in mm ───
const PERMANENT = {
  upper: {
    1: { dims: [8.5, 6.4, 10.5, 13], type: "incisor" },
    2: { dims: [6.5, 4.8, 9, 13], type: "incisor" },
    3: { dims: [7.5, 5.5, 10, 17], type: "canine" },
    4: { dims: [7, 5, 8.5, 14], type: "premolar", roots: "bifid" },
    5: { dims: [6.5, 5, 8.5, 14], type: "premolar" },
    6: { dims: [10, 8, 7.5, 12.5], type: "molar", cusps: 2, roots: "upper" },
    7: { dims: [9, 7, 7, 11.5], type: "molar", cusps: 2, roots: "upper", close: 0.6 },
    8: { dims: [8.5, 6.5, 6.5, 10.5], type: "molar", cusps: 2, roots: "fused" },
  },
  lower: {
    1: { dims: [5, 3.5, 9, 12.5], type: "incisor", symmetric: true },
    2: { dims: [5.5, 4, 9.5, 14], type: "incisor", symmetric: true },
    3: { dims: [7, 5.5, 11, 16], type: "canine" },
    4: { dims: [7, 5, 8.5, 14], type: "premolar" },
    5: { dims: [7, 5, 8, 14.5], type: "premolar" },
    6: { dims: [11, 9, 7.5, 14], type: "molar", cusps: 3, roots: "lower" },
    7: { dims: [10.5, 8, 7, 13], type: "molar", cusps: 2, roots: "lower", close: 0.5 },
    8: { dims: [10, 7.5, 7, 11], type: "molar", cusps: 2, roots: "fused" },
  },
};

const DECIDUOUS = {
  upper: {
    1: { dims: [6.5, 5, 6, 10], type: "incisor" },
    2: { dims: [5.1, 3.8, 5.6, 11], type: "incisor" },
    3: { dims: [7, 5, 6.5, 13], type: "canine" },
    4: { dims: [7.3, 5.2, 5.1, 10], type: "molar", cusps: 2, roots: "upper", flare: 0.55 },
    5: { dims: [8.2, 6, 5.7, 11.7], type: "molar", cusps: 2, roots: "upper", flare: 0.5 },
  },
  lower: {
    1: { dims: [4.2, 3, 5, 9], type: "incisor", symmetric: true },
    2: { dims: [4.1, 3, 5.2, 10], type: "incisor", symmetric: true },
    3: { dims: [5, 3.7, 6, 11.5], type: "canine" },
    4: { dims: [7.7, 5.5, 6, 9.8], type: "molar", cusps: 2, roots: "lower", flare: 0.55 },
    5: { dims: [9.9, 7, 5.5, 10], type: "molar", cusps: 3, roots: "lower", flare: 0.5 },
  },
};

/** FDI quadrant (1–8) of a tooth number. */
export function quadrantOf(number) {
  return Number(String(number)[0]);
}

export function isUpperTooth(number) {
  return [1, 2, 5, 6].includes(quadrantOf(number));
}

export function isDeciduousTooth(number) {
  return quadrantOf(number) >= 5;
}

/** Incisors and canines have an incisal edge instead of an occlusal surface. */
export function isAnteriorTooth(number) {
  return Number(String(number).slice(-1)) <= 3;
}

function buildShape(spec) {
  const [W, Wc, H, rootLength] = spec.dims;
  const R = rootLength * ROOT_SCALE;
  const dip = H * 0.08;

  let crownPts;
  if (spec.type === "incisor") crownPts = incisorCrown(W, Wc, H, spec);
  else if (spec.type === "canine") crownPts = canineCrown(W, Wc, H);
  else if (spec.type === "premolar") crownPts = premolarCrown(W, Wc, H);
  else crownPts = spec.cusps === 3 ? threeCuspCrown(W, Wc, H) : twoCuspCrown(W, Wc, H);

  let rootPts;
  if (spec.roots === "bifid") rootPts = bifidRoot(Wc, H, R);
  else if (spec.roots === "upper" || spec.roots === "lower") rootPts = twoRoots(Wc, H, R, spec.close || 0);
  else if (spec.roots === "fused") rootPts = fusedRoot(Wc, H, R);
  else rootPts = singleRoot(Wc, H, R);
  rootPts = flareRoots(rootPts, H, R, spec.flare);

  const m0 = [Wc / 2, H];
  const d0 = [-Wc / 2, H];
  const crown = openPath(crownPts) + cejCurve(m0, d0, H, dip) + " Z";
  const root = openPath(rootPts) + cejCurve(d0, m0, H, dip) + " Z";

  const flare = (x, y) => x * (1 + (spec.flare || 0) * Math.max(0, (y - H) / R));
  const canal = (pts) => openPath(pts.map(([x, y]) => [flare(x, y), y]));

  let hiddenRoot = null;
  let canals;
  if (spec.roots === "upper") {
    hiddenRoot = openPath(flareRoots(palatalRoot(Wc, H, R), H, R, spec.flare * 0.3)) + " Z";
    canals = [
      canal([[0, H * 0.6], [Wc * 0.26, H + R * 0.45], [Wc * 0.25, H + R * 0.93]]),
      canal([[0, H * 0.6], [-Wc * 0.27, H + R * 0.45], [-Wc * 0.3, H + R * 0.86]]),
    ];
  } else if (spec.roots === "lower") {
    canals = [
      canal([[0, H * 0.6], [Wc * 0.3, H + R * 0.45], [Wc * 0.25, H + R * 0.94]]),
      canal([[0, H * 0.6], [-Wc * 0.3, H + R * 0.45], [-Wc * 0.33, H + R * 0.88]]),
    ];
  } else if (spec.roots === "bifid") {
    canals = [
      canal([[0, H * 0.5], [Wc * 0.05, H + R * 0.6], [Wc * 0.13, H + R * 0.94]]),
      canal([[0, H * 0.5], [-Wc * 0.05, H + R * 0.6], [-Wc * 0.12, H + R * 0.92]]),
    ];
  } else {
    canals = [canal([[0, H * 0.4], [0, H + R * 0.45], [-Wc * 0.04, H + R * 0.95]])];
  }

  const details = [];
  if (spec.type === "molar") {
    if (spec.cusps === 3) {
      details.push(openPath([[-W * 0.24, H * 0.13], [-W * 0.25, H * 0.34]]));
      details.push(openPath([[W * 0.04, H * 0.15], [W * 0.03, H * 0.5]]));
    } else {
      details.push(openPath([[-W * 0.02, H * 0.18], [-W * 0.02, H * 0.5]]));
    }
  }
  if (spec.roots === "fused") {
    details.push(openPath([[-Wc * 0.02, H + R * 0.18], [-Wc * 0.06, H + R * 0.8]]));
  }

  return {
    W,
    Wc,
    H,
    R,
    crown,
    root,
    hiddenRoot,
    canals,
    details,
    chamber: { cx: 0, cy: H * 0.66, rx: Math.max(W * 0.16, 0.9), ry: H * 0.16 },
  };
}

const shapeCache = new Map();

/** Shape for an FDI tooth number (11–48 permanent, 51–85 deciduous). */
export function getToothShape(number) {
  const key = String(number);
  if (!shapeCache.has(key)) {
    const table = isDeciduousTooth(number) ? DECIDUOUS : PERMANENT;
    const arch = isUpperTooth(number) ? table.upper : table.lower;
    shapeCache.set(key, buildShape(arch[Number(key.slice(-1))]));
  }
  return shapeCache.get(key);
}

/**
 * Where a surface sits on the buccal-view drawing, in canonical coordinates.
 * The lingual surface is on the far side of the tooth, so it is drawn centred
 * and rendered as "behind" by the caller.
 */
export function surfaceSpot(shape, surface, anterior) {
  const { W, H } = shape;
  switch (surface) {
    case "occlusal":
      return anterior
        ? { cx: 0, cy: H * 0.07, rx: W * 0.3, ry: H * 0.09 }
        : { cx: 0, cy: H * 0.12, rx: W * 0.24, ry: H * 0.13 };
    case "mesial":
      return { cx: W * 0.4, cy: H * 0.34, rx: W * 0.13, ry: H * 0.2 };
    case "distal":
      return { cx: -W * 0.4, cy: H * 0.34, rx: W * 0.13, ry: H * 0.2 };
    case "buccal":
      return { cx: 0, cy: H * 0.68, rx: W * 0.22, ry: H * 0.12 };
    case "lingual":
      return { cx: 0, cy: H * 0.42, rx: W * 0.2, ry: H * 0.14 };
    default:
      return null;
  }
}
