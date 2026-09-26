import { getToothShape, isAnteriorTooth, isUpperTooth, quadrantOf } from "./toothShapes";

// ─── Conditions ───────────────────────────────────────────────────────
export const CONDITION_OPTIONS = [
  { key: "HEALTHY",    label: "Healthy" },
  { key: "CAVITY",     label: "Cavity / Decay" },
  { key: "FILLING",    label: "Filling" },
  { key: "RCT",        label: "Root Canal" },
  { key: "CROWN",      label: "Crown" },
  { key: "IMPLANT",    label: "Implant" },
  { key: "MISSING",    label: "Missing" },
  { key: "FRACTURED",  label: "Fractured" },
  { key: "BRIDGE",     label: "Bridge" },
];

export const CONDITION_COLORS = {
  HEALTHY:   "#FFFFFF",
  CAVITY:    "#6B2F12",
  FILLING:   "#2563EB",
  RCT:       "#7E22CE",
  CROWN:     "#D4A843",
  IMPLANT:   "#475569",
  MISSING:   "#6B7280",
  FRACTURED: "#F97316",
  BRIDGE:    "#94A3B8",
};

export const CONDITION_LEGEND = [
  { key: "HEALTHY",   label: "Healthy",      swatch: "#FFFFFF", border: "#B8AE9F" },
  { key: "CAVITY",    label: "Cavity/Decay", swatch: "#6B2F12", border: "#4A1F0B" },
  { key: "FILLING",   label: "Filling",      swatch: "#2563EB", border: "#1E40AF" },
  { key: "RCT",       label: "Root Canal",   swatch: "#7E22CE", border: "#581C87" },
  { key: "CROWN",     label: "Crown",        swatch: "#D4A843", border: "#8F6B1E" },
  { key: "IMPLANT",   label: "Implant",      swatch: "#475569", border: "#1F2937" },
  { key: "BRIDGE",    label: "Bridge",       swatch: "#94A3B8", border: "#475569" },
  { key: "FRACTURED", label: "Fractured",    swatch: "#F97316", border: "#C2410C" },
  { key: "MISSING",   label: "Missing",      swatch: "#FFFFFF", border: "#6B7280", cross: true },
];

// Conditions that affect individual surfaces; the rest apply to the whole tooth.
export const SURFACE_CONDITIONS = new Set(["CAVITY", "FILLING", "FRACTURED"]);

// Conditions that can be the result of treatment done at another clinic.
export const TREATMENT_CONDITIONS = new Set(["FILLING", "RCT", "CROWN", "IMPLANT", "BRIDGE", "MISSING"]);

// ─── Surface options ──────────────────────────────────────────────────
export const SURFACE_OPTIONS = [
  { key: "mesial",   label: "M", fullLabel: "Mesial" },
  { key: "distal",   label: "D", fullLabel: "Distal" },
  { key: "occlusal", label: "O", fullLabel: "Occlusal" },
  { key: "buccal",   label: "B", fullLabel: "Buccal" },
  { key: "lingual",  label: "L", fullLabel: "Lingual" },
];

const SURFACE_KEYS = SURFACE_OPTIONS.map((s) => s.key);

/** Surface name as it applies to this tooth (incisal / labial / palatal). */
export function surfaceLabel(key, toothNumber) {
  const anterior = isAnteriorTooth(toothNumber);
  const upper = isUpperTooth(toothNumber);
  if (key === "occlusal" && anterior) return { short: "I", full: "Incisal" };
  if (key === "buccal" && anterior) return { short: "B", full: "Labial" };
  if (key === "lingual" && upper) return { short: "L", full: "Palatal" };
  const opt = SURFACE_OPTIONS.find((s) => s.key === key);
  return { short: opt?.label || key, full: opt?.fullLabel || key };
}

// ─── Condition aliases (for legacy data) ──────────────────────────────
const CONDITION_ALIASES = {
  healthy:     "HEALTHY",
  caries:      "CAVITY",
  cavity:      "CAVITY",
  rct:         "RCT",
  "root-canal": "RCT",
  root_canal:  "RCT",
  filling:     "FILLING",
  crown:       "CROWN",
  veneer:      "CROWN",
  implant:     "IMPLANT",
  extraction:  "MISSING",
  missing:     "MISSING",
  fractured:   "FRACTURED",
  bridge:      "BRIDGE",
};

// ─── Tooth numbering ──────────────────────────────────────────────────
const upperNumbers = ["18","17","16","15","14","13","12","11","21","22","23","24","25","26","27","28"];
const lowerNumbers = ["48","47","46","45","44","43","42","41","31","32","33","34","35","36","37","38"];

const deciduousUpperNumbers = ["55","54","53","52","51","61","62","63","64","65"];
const deciduousLowerNumbers = ["85","84","83","82","81","71","72","73","74","75"];

// ─── Tooth names (FDI → human-readable) ───────────────────────────────
const TOOTH_NAMES = {
  // Upper right
  "18": "Upper Right Third Molar",  "17": "Upper Right Second Molar",
  "16": "Upper Right First Molar",  "15": "Upper Right Second Premolar",
  "14": "Upper Right First Premolar","13": "Upper Right Canine",
  "12": "Upper Right Lateral Incisor","11": "Upper Right Central Incisor",
  // Upper left
  "21": "Upper Left Central Incisor","22": "Upper Left Lateral Incisor",
  "23": "Upper Left Canine",        "24": "Upper Left First Premolar",
  "25": "Upper Left Second Premolar","26": "Upper Left First Molar",
  "27": "Upper Left Second Molar",  "28": "Upper Left Third Molar",
  // Lower left
  "31": "Lower Left Central Incisor","32": "Lower Left Lateral Incisor",
  "33": "Lower Left Canine",        "34": "Lower Left First Premolar",
  "35": "Lower Left Second Premolar","36": "Lower Left First Molar",
  "37": "Lower Left Second Molar",  "38": "Lower Left Third Molar",
  // Lower right
  "41": "Lower Right Central Incisor","42": "Lower Right Lateral Incisor",
  "43": "Lower Right Canine",        "44": "Lower Right First Premolar",
  "45": "Lower Right Second Premolar","46": "Lower Right First Molar",
  "47": "Lower Right Second Molar",  "48": "Lower Right Third Molar",
  // Deciduous upper right
  "55": "Upper Right Second Molar (Deciduous)", "54": "Upper Right First Molar (Deciduous)",
  "53": "Upper Right Canine (Deciduous)", "52": "Upper Right Lateral Incisor (Deciduous)",
  "51": "Upper Right Central Incisor (Deciduous)",
  // Deciduous upper left
  "61": "Upper Left Central Incisor (Deciduous)", "62": "Upper Left Lateral Incisor (Deciduous)",
  "63": "Upper Left Canine (Deciduous)", "64": "Upper Left First Molar (Deciduous)",
  "65": "Upper Left Second Molar (Deciduous)",
  // Deciduous lower left
  "71": "Lower Left Central Incisor (Deciduous)", "72": "Lower Left Lateral Incisor (Deciduous)",
  "73": "Lower Left Canine (Deciduous)", "74": "Lower Left First Molar (Deciduous)",
  "75": "Lower Left Second Molar (Deciduous)",
  // Deciduous lower right
  "81": "Lower Right Central Incisor (Deciduous)", "82": "Lower Right Lateral Incisor (Deciduous)",
  "83": "Lower Right Canine (Deciduous)", "84": "Lower Right First Molar (Deciduous)",
  "85": "Lower Right Second Molar (Deciduous)",
};

export function toothName(number) {
  return TOOTH_NAMES[String(number)] || `Tooth ${number}`;
}

// ─── Chart layout ─────────────────────────────────────────────────────
const CHART_WIDTH = 1280;
const CHART_SIDE = 56;   // room for the R / L labels
const ARCH_GAP = 44;     // space between the upper and lower teeth

const ARCH_SETS = {
  permanent: { upper: upperNumbers, lower: lowerNumbers, maxScale: 9, toothGap: 10 },
  deciduous: { upper: deciduousUpperNumbers, lower: deciduousLowerNumbers, maxScale: 11, toothGap: 16 },
};

/**
 * Positions every tooth of a dentition ("permanent" | "deciduous").
 * Teeth sit side by side at their real relative widths; upper crowns hang
 * down to the occlusal line and lower crowns rise up to meet them.
 */
export function buildArchLayout(set) {
  const def = ARCH_SETS[set];
  const gaps = (row) => def.toothGap * (row.length - 1);
  const mmWidth = (row) => row.reduce((w, n) => w + getToothShape(n).W, 0);
  const avail = CHART_WIDTH - CHART_SIDE * 2;
  const scale = Math.min(
    def.maxScale,
    ...[def.upper, def.lower].map((row) => (avail - gaps(row)) / mmWidth(row))
  );
  const rowHeight = (row) =>
    Math.max(...row.map((n) => {
      const shape = getToothShape(n);
      return (shape.H + shape.R) * scale;
    }));

  const upperNumY = 30;
  const upperTeethTop = upperNumY + 30;
  const upperOcclusal = upperTeethTop + rowHeight(def.upper);
  const lowerOcclusal = upperOcclusal + ARCH_GAP;
  const lowerTeethBottom = lowerOcclusal + rowHeight(def.lower);
  const lowerNumY = lowerTeethBottom + 42;

  const place = (row, upper) => {
    let x = (CHART_WIDTH - (mmWidth(row) * scale + gaps(row))) / 2;
    return row.map((number) => {
      const shape = getToothShape(number);
      const width = shape.W * scale;
      const cx = x + width / 2;
      x += width + def.toothGap;
      return {
        number,
        row: upper ? "upper" : "lower",
        shape,
        scale,
        x: cx,
        yOcc: upper ? upperOcclusal : lowerOcclusal,
        // Patient's left side (right half of the chart) is mirrored so mesial faces the midline.
        mirror: [2, 3, 6, 7].includes(quadrantOf(number)),
        anterior: isAnteriorTooth(number),
        numY: upper ? upperNumY : lowerNumY,
        // "Treated elsewhere" arrow sits between the tooth number and the tooth.
        arrow: upper
          ? { tail: upperNumY + 6, head: upperTeethTop - 2 }
          : { tail: lowerNumY - 18, head: lowerTeethBottom + 2 },
      };
    });
  };

  return {
    width: CHART_WIDTH,
    height: lowerNumY + 16,
    midY: (upperOcclusal + lowerOcclusal) / 2,
    midX: CHART_WIDTH / 2,
    guideTop: upperTeethTop - 6,
    guideBottom: lowerTeethBottom + 6,
    upper: place(def.upper, true),
    lower: place(def.lower, false),
  };
}

/** Dentition that shows every tooth already marked, or null for an empty chart. */
export function inferDentition(records) {
  const hasDeciduous = records.some((r) => quadrantOf(r.tooth) >= 5);
  const hasPermanent = records.some((r) => quadrantOf(r.tooth) <= 4);
  if (hasDeciduous && hasPermanent) return "mixed";
  if (hasDeciduous) return "deciduous";
  if (hasPermanent) return "permanent";
  return null;
}

// ─── Normalization helpers ────────────────────────────────────────────
export function normalizeCondition(condition) {
  if (!condition) return "HEALTHY";
  const raw = String(condition).trim();
  const upper = raw.toUpperCase();
  if (CONDITION_COLORS[upper]) return upper;
  return CONDITION_ALIASES[raw.toLowerCase()] || "HEALTHY";
}

// Old charts stored one condition per surface: { occlusal: "cavity", mesial: "filling" }.
function fromLegacyValue(value) {
  if (!value) return { condition: "HEALTHY", surfaces: [] };
  if (typeof value === "string") return { condition: normalizeCondition(value), surfaces: [] };
  if (typeof value !== "object") return { condition: "HEALTHY", surfaces: [] };
  if (value.condition) {
    return { condition: normalizeCondition(value.condition), surfaces: value.surfaces || [] };
  }
  const marked = Object.entries(value)
    .filter(([key, cond]) => SURFACE_KEYS.includes(key) && normalizeCondition(cond) !== "HEALTHY")
    .map(([key, cond]) => [key, normalizeCondition(cond)]);
  if (marked.length === 0) return { condition: "HEALTHY", surfaces: [] };
  const counts = {};
  marked.forEach(([, cond]) => { counts[cond] = (counts[cond] || 0) + 1; });
  const condition = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  return { condition, surfaces: marked.filter(([, cond]) => cond === condition).map(([key]) => key) };
}

export function normalizeTeethRecords(value) {
  const rawTeeth = value?.teeth ?? value ?? [];

  if (Array.isArray(rawTeeth)) {
    return rawTeeth
      .map((record) => ({
        tooth: String(record?.tooth || record?.number || "").trim(),
        condition: normalizeCondition(record?.condition),
        surfaces: record?.surfaces || [],
        treatedThisVisit: record?.treatedThisVisit || false,
        treatedElsewhere: record?.treatedElsewhere || false,
      }))
      .filter((record) => record.tooth);
  }

  if (rawTeeth && typeof rawTeeth === "object") {
    return Object.entries(rawTeeth)
      .map(([tooth, data]) => ({
        tooth: String(tooth),
        ...fromLegacyValue(data),
        treatedThisVisit: data?.treatedThisVisit || false,
        treatedElsewhere: data?.treatedElsewhere || false,
      }))
      .filter((record) => record.tooth);
  }

  return [];
}

export function recordsToConditionMap(records) {
  const map = {};
  records.forEach((record) => {
    map[record.tooth] = {
      condition: normalizeCondition(record.condition),
      surfaces: record.surfaces || [],
      treatedThisVisit: record.treatedThisVisit || false,
      treatedElsewhere: record.treatedElsewhere || false,
    };
  });
  return map;
}

export function conditionLabel(condition) {
  return (
    CONDITION_OPTIONS.find((item) => item.key === normalizeCondition(condition))
      ?.label || "Healthy"
  );
}
