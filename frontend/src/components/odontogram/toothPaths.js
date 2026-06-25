/**
 * Anatomically-distinct SVG path data for every tooth type in both arches.
 *
 * Each entry contains:
 *   body     – main outline of the tooth (crown + root)
 *   details  – anatomical lines (fissures, root separations, neck line)
 *   w / h    – natural width and height the path was designed for
 *
 * Upper teeth: crown at bottom, roots at top  (drawn with roots pointing up)
 * Lower teeth: crown at top,   roots at bottom (drawn with roots pointing down)
 *
 * All paths are centered on x = 0 so they can be placed with a simple translate.
 */

// ─── UPPER TEETH ──────────────────────────────────────────────────────
const upperMolar = {
  // Wide rectangular crown, 3-4 cusps, 2-3 roots
  body: "M-26 0 C-28 4 -30 14 -28 24 C-30 18 -26 8 -22 2 C-20 0 -16 -2 -12 0 L-8 4 C-6 0 -2 -4 2 -4 C6 -4 10 0 12 4 L16 0 C20 -2 24 0 26 4 C30 12 32 22 30 30 L28 24 C29 28 28 35 26 42 C24 50 22 56 22 64 C22 72 24 80 26 86 L22 80 C20 72 18 66 15 70 C12 76 10 84 12 94 C14 106 8 112 4 114 C2 116 -2 116 -4 114 C-8 112 -14 106 -12 94 C-10 84 -12 76 -15 70 C-18 66 -20 72 -22 80 L-26 86 C-24 80 -22 72 -22 64 C-22 56 -24 50 -26 42 Z",
  details: [
    // neck line
    "M-24 42 C-16 38 -6 36 0 36 C6 36 16 38 24 42",
    // root separation lines
    "M-8 42 C-6 56 -4 70 -6 86",
    "M8 42 C6 56 4 70 6 86",
    // cusp fissures
    "M-18 16 C-12 22 -4 24 0 20 C4 24 12 22 18 16",
  ],
  w: 60,
  h: 116,
};

const upperMolarThird = {
  // Slightly smaller, more irregular
  body: "M-22 2 C-24 6 -26 16 -24 26 C-26 20 -22 10 -18 4 C-16 2 -13 0 -10 2 L-6 6 C-4 2 0 -2 3 -2 C6 -2 9 2 11 6 L14 2 C17 0 20 2 22 6 C25 14 26 22 24 30 L22 26 C23 30 22 36 20 42 C18 50 17 56 17 64 C17 70 18 76 19 80 C16 78 13 72 12 66 C10 58 6 66 4 74 C2 80 0 88 -2 92 C-4 88 -6 80 -8 74 C-10 66 -14 58 -16 66 C-17 72 -18 76 -18 80 C-19 76 -17 70 -17 64 C-17 56 -18 50 -20 42 Z",
  details: [
    "M-20 40 C-12 36 -4 34 2 34 C8 34 14 36 20 40",
    "M-6 40 C-4 52 -2 64 -4 78",
    "M6 40 C4 52 2 64 4 78",
    "M-14 16 C-8 22 -2 22 2 18 C6 22 12 20 16 14",
  ],
  w: 52,
  h: 94,
};

const upperPremolar = {
  // Medium width, 2 cusps, 1-2 roots
  body: "M-18 4 C-20 10 -20 20 -18 28 C-20 24 -18 14 -14 6 C-12 2 -8 0 -4 2 L0 8 C2 4 6 0 10 2 C14 4 18 10 18 18 C20 28 18 36 16 42 C14 50 14 58 14 68 C14 78 16 90 14 100 C12 108 6 114 2 118 C0 120 -2 120 -4 118 C-8 114 -14 108 -16 100 C-18 90 -16 78 -14 68 C-14 58 -14 50 -16 42 Z",
  details: [
    "M-16 40 C-10 36 -2 34 2 34 C8 36 14 38 16 40",
    "M0 40 C-2 58 -2 78 0 100",
    "M-8 10 C-2 18 4 18 10 10",
  ],
  w: 40,
  h: 120,
};

const upperCanine = {
  // Narrow, single pointed cusp, long root
  body: "M-14 8 C-16 16 -16 26 -14 34 C-16 30 -14 20 -10 12 C-8 6 -4 0 0 -4 C4 0 8 6 10 12 C14 20 16 30 16 38 C16 46 14 54 12 62 C10 70 8 80 8 92 C8 104 10 116 8 128 C6 136 2 142 0 144 C-2 142 -6 136 -8 128 C-10 116 -8 104 -8 92 C-8 80 -10 70 -12 62 C-14 54 -16 46 -14 34 Z",
  details: [
    "M-14 50 C-8 46 -2 44 0 44 C4 44 10 46 14 50",
    "M0 50 C0 72 0 100 0 130",
    "M-6 6 C-2 -2 2 -2 6 6",
  ],
  w: 34,
  h: 146,
};

const upperLateralIncisor = {
  // Narrow, slightly smaller than central
  body: "M-12 10 C-14 18 -14 28 -12 36 C-14 32 -12 22 -8 14 C-6 8 -3 4 0 2 C3 4 6 8 8 14 C12 22 14 32 14 40 C14 48 12 58 10 68 C8 78 6 92 6 106 C6 118 8 128 6 138 C4 144 2 148 0 150 C-2 148 -4 144 -6 138 C-8 128 -6 118 -6 106 C-6 92 -8 78 -10 68 C-12 58 -14 48 -12 36 Z",
  details: [
    "M-12 48 C-6 44 -2 42 0 42 C4 44 8 44 12 48",
    "M0 48 C0 72 0 104 0 138",
  ],
  w: 30,
  h: 152,
};

const upperCentralIncisor = {
  // Widest front teeth, flat bottom edge
  body: "M-15 10 C-17 18 -17 28 -15 36 C-17 32 -15 22 -11 14 C-9 8 -5 2 0 0 C5 2 9 8 11 14 C15 22 17 32 17 40 C17 48 15 58 13 68 C11 78 9 90 9 104 C9 116 10 128 8 138 C6 146 2 152 0 154 C-2 152 -6 146 -8 138 C-10 128 -9 116 -9 104 C-9 90 -11 78 -13 68 C-15 58 -17 48 -15 36 Z",
  details: [
    "M-15 50 C-8 46 -2 44 0 44 C4 44 10 46 15 50",
    "M0 50 C0 74 0 108 0 140",
  ],
  w: 36,
  h: 156,
};

// ─── LOWER TEETH ──────────────────────────────────────────────────────
const lowerMolar = {
  // Wide crown with cusps on TOP, 2 roots at bottom
  body: "M-24 82 C-26 74 -26 64 -24 56 C-26 60 -24 70 -22 78 C-20 82 -16 86 -12 84 L-6 78 C-4 82 0 86 4 86 C8 86 12 82 14 78 L18 84 C22 86 26 82 26 78 C28 68 28 58 26 50 C24 42 22 36 22 26 C22 18 24 10 26 4 C22 8 18 16 16 24 C14 30 10 24 8 16 C6 8 2 4 0 0 C-2 4 -6 8 -8 16 C-10 24 -14 30 -16 24 C-18 16 -20 8 -22 4 C-24 10 -22 18 -22 26 C-22 36 -24 42 -26 50 Z",
  details: [
    "M-24 50 C-16 54 -6 56 0 56 C8 56 18 54 24 50",
    "M-6 50 C-4 36 -2 22 -4 6",
    "M8 50 C6 36 4 22 6 6",
    "M-16 78 C-10 72 -2 70 4 72 C10 72 16 76 20 80",
  ],
  w: 56,
  h: 88,
};

const lowerMolarThird = {
  body: "M-20 76 C-22 68 -22 60 -20 52 C-22 56 -20 64 -18 72 C-16 76 -12 78 -8 76 L-4 72 C-2 76 2 80 5 80 C8 80 10 76 12 72 L15 76 C18 78 20 76 20 72 C22 62 22 52 20 44 C18 36 16 30 16 22 C16 14 18 6 18 2 C14 6 12 14 10 20 C8 26 4 20 2 12 C0 6 -2 2 -4 0 C-6 2 -8 6 -10 12 C-12 20 -16 26 -18 20 C-20 14 -20 8 -18 2 C-18 6 -16 14 -16 22 C-16 30 -18 36 -20 44 Z",
  details: [
    "M-18 46 C-12 50 -4 52 2 52 C8 50 14 48 18 46",
    "M-4 46 C-2 32 -2 18 -4 4",
    "M6 46 C4 32 4 18 6 4",
    "M-12 72 C-6 66 0 64 6 66 C10 68 14 72 16 76",
  ],
  w: 46,
  h: 82,
};

const lowerPremolar = {
  // 2 cusps on top, 1 root at bottom
  body: "M-16 76 C-18 68 -18 58 -16 50 C-18 54 -16 64 -12 72 C-10 76 -6 78 -2 76 L2 70 C4 74 8 78 12 76 C16 74 18 66 18 58 C18 50 16 42 14 36 C12 28 12 18 12 8 C12 4 10 0 8 -2 C6 2 4 8 2 16 C0 24 -2 24 -4 16 C-6 8 -8 2 -10 -2 C-12 0 -14 4 -14 8 C-14 18 -14 28 -16 36 C-18 42 -18 50 -16 50 Z",
  details: [
    "M-16 46 C-10 50 -4 52 2 52 C8 50 14 48 16 46",
    "M0 46 C0 30 0 16 0 2",
    "M-8 72 C-2 66 4 66 10 70",
  ],
  w: 36,
  h: 80,
};

const lowerCanine = {
  body: "M-13 92 C-14 82 -14 72 -13 62 C-14 66 -14 76 -12 86 C-10 90 -6 94 -2 92 C2 90 6 86 8 80 C10 72 12 62 12 52 C12 42 10 32 8 22 C6 12 4 4 2 -2 C0 -6 -2 -6 -4 -2 C-6 4 -8 12 -10 22 C-12 32 -14 42 -14 52 C-14 62 -14 72 -13 62 Z",
  details: [
    "M-12 52 C-6 48 0 46 2 46 C6 48 10 50 12 52",
    "M0 52 C0 32 0 14 0 -2",
  ],
  w: 28,
  h: 96,
};

const lowerIncisor = {
  // Narrowest teeth
  body: "M-10 78 C-12 70 -12 60 -10 52 C-12 56 -10 66 -8 74 C-6 78 -4 80 -2 78 C0 76 2 72 4 66 C6 58 8 48 8 40 C8 32 6 22 4 14 C2 6 0 0 -1 -2 C-2 0 -4 6 -6 14 C-8 22 -10 32 -10 40 C-10 48 -10 58 -10 52 Z",
  details: [
    "M-8 42 C-4 40 0 38 2 38 C4 40 6 40 8 42",
    "M0 42 C0 26 0 12 0 0",
  ],
  w: 22,
  h: 82,
};

// ─── PUBLIC LOOKUP ────────────────────────────────────────────────────
/**
 * Returns path data for a tooth given its row ("upper"/"lower") and kind.
 * Third molars (digit 8) get a slightly different shape.
 */
export function getToothPath(row, kind, toothNumber) {
  const digit = String(toothNumber).slice(-1);
  const isThird = digit === "8";

  if (row === "upper") {
    switch (kind) {
      case "molar":
        return isThird ? upperMolarThird : upperMolar;
      case "premolar":
        return upperPremolar;
      case "canine":
        return upperCanine;
      case "lateralIncisor":
        return upperLateralIncisor;
      case "centralIncisor":
        return upperCentralIncisor;
      default:
        return upperCentralIncisor;
    }
  }

  // lower
  switch (kind) {
    case "molar":
      return isThird ? lowerMolarThird : lowerMolar;
    case "premolar":
      return lowerPremolar;
    case "canine":
      return lowerCanine;
    case "lateralIncisor":
    case "centralIncisor":
      return lowerIncisor;
    default:
      return lowerIncisor;
  }
}

/** Classify tooth by its last digit into a specific kind */
export function toothKindDetailed(number) {
  const d = String(number).slice(-1);
  if (["6", "7", "8"].includes(d)) return "molar";
  if (["4", "5"].includes(d)) return "premolar";
  if (d === "3") return "canine";
  if (d === "2") return "lateralIncisor";
  return "centralIncisor"; // 1
}
