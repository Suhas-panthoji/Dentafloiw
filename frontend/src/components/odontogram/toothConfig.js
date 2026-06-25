import { toothKindDetailed } from "./toothPaths";

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
  HEALTHY:   "#F5F5F5",
  CAVITY:    "#C4906A",
  FILLING:   "#E8E4E0",
  RCT:       "#8A5AA0",
  CROWN:     "#D4A843",
  IMPLANT:   "#2A7A7A",
  MISSING:   "#968C82",
  FRACTURED: "#E87040",
  BRIDGE:    "#5A8ABF",
};

export const CONDITION_LEGEND = [
  { key: "HEALTHY",   label: "Healthy",      swatch: "#F5F5F5",  border: "#C8C0B8" },
  { key: "CAVITY",    label: "Cavity/Decay",  swatch: "#C4906A",  border: "#A87858" },
  { key: "FILLING",   label: "Filling",       swatch: "#E8E4E0",  border: "#C8C4C0" },
  { key: "RCT",       label: "Root Canal",    swatch: "#8A5AA0",  border: "#6E4480" },
  { key: "CROWN",     label: "Crown",         swatch: "#D4A843",  border: "#B8922E" },
  { key: "IMPLANT",   label: "Implant",       swatch: "#2A7A7A",  border: "#1E5E5E" },
  { key: "MISSING",   label: "Missing",       swatch: "#968C82",  border: "#7A7068" },
  { key: "FRACTURED", label: "Fractured",     swatch: "#E87040",  border: "#C45830" },
];

// ─── Surface options ──────────────────────────────────────────────────
export const SURFACE_OPTIONS = [
  { key: "mesial",   label: "M", fullLabel: "Mesial" },
  { key: "distal",   label: "D", fullLabel: "Distal" },
  { key: "occlusal", label: "O", fullLabel: "Occlusal" },
  { key: "buccal",   label: "B", fullLabel: "Buccal" },
  { key: "lingual",  label: "L", fullLabel: "Lingual" },
];

// ─── Condition aliases (for legacy data) ──────────────────────────────
const CONDITION_ALIASES = {
  healthy:     "HEALTHY",
  caries:      "CAVITY",
  cavity:      "CAVITY",
  planned:     "MISSING",
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

// ─── Deciduous tooth kind mapping ─────────────────────────────────────
function deciduousKind(number) {
  const d = String(number).slice(-1);
  if (["4", "5"].includes(d)) return "molar";
  if (d === "3") return "canine";
  if (d === "2") return "lateralIncisor";
  return "centralIncisor"; // 1
}

// ─── Layout builders ──────────────────────────────────────────────────
function buildLayout(numbers, row, labelYOffset, yBase, scaleFactor = 1) {
  const count = numbers.length;
  const totalWidth = 1080;
  const startX = 100;
  const spacing = totalWidth / count;

  return numbers.map((number, index) => {
    const isDeciduous = parseInt(number) >= 51;
    const kind = isDeciduous ? deciduousKind(number) : toothKindDetailed(number);
    const digit = String(number).slice(-1);

    let scale = scaleFactor;
    if (!isDeciduous) {
      if (digit === "8") scale *= 0.92;
      else if (["6","7"].includes(digit)) scale *= 1.0;
      else if (["4","5"].includes(digit)) scale *= 0.88;
      else if (digit === "3") scale *= 0.82;
      else if (digit === "2") scale *= 0.72;
      else scale *= 0.76;
    } else {
      scale *= 0.7;
    }

    return {
      number,
      row,
      kind,
      x: startX + spacing * index + spacing / 2,
      y: yBase,
      labelY: labelYOffset,
      scale,
    };
  });
}

export function getPermanentLayout() {
  return [
    ...buildLayout(upperNumbers, "upper", 48, 120, 0.88),
    ...buildLayout(lowerNumbers, "lower", 490, 290, 0.88),
  ];
}

export function getDeciduousLayout() {
  return [
    ...buildLayout(deciduousUpperNumbers, "upper", 48, 130, 0.85),
    ...buildLayout(deciduousLowerNumbers, "lower", 480, 280, 0.85),
  ];
}

export function getMixedLayout() {
  // Show permanent teeth but with deciduous overlaid on teeth 1-5 positions
  return getPermanentLayout();
}

// Default: permanent
export const TOOTH_LAYOUT = getPermanentLayout();

// ─── Normalization helpers ────────────────────────────────────────────
export function normalizeCondition(condition) {
  if (!condition) return "HEALTHY";
  const raw = String(condition).trim();
  const upper = raw.toUpperCase();
  if (CONDITION_COLORS[upper]) return upper;
  return CONDITION_ALIASES[raw.toLowerCase()] || "HEALTHY";
}

function conditionFromLegacyValue(value) {
  if (!value) return "HEALTHY";
  if (typeof value === "string") return normalizeCondition(value);
  if (typeof value !== "object") return "HEALTHY";
  if (value.condition) return normalizeCondition(value.condition);
  const found = Object.values(value).find(
    (item) => item && normalizeCondition(item) !== "HEALTHY"
  );
  return normalizeCondition(found);
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
      }))
      .filter((record) => record.tooth);
  }

  if (rawTeeth && typeof rawTeeth === "object") {
    return Object.entries(rawTeeth)
      .map(([tooth, data]) => ({
        tooth: String(tooth),
        condition: conditionFromLegacyValue(data),
        surfaces: data?.surfaces || [],
        treatedThisVisit: data?.treatedThisVisit || false,
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
