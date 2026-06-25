// shared constants and helpers — identical to main Dentaflow app

export const TOOTH_CONDITIONS = [
  { key: "healthy",    label: "Healthy",    color: "#EAE5DA" },
  { key: "missing",    label: "Missing",    color: "#A3A3A3" },
  { key: "cavity",     label: "Cavity",     color: "#EB5757" },
  { key: "planned",    label: "Planned",    color: "#EB5757" },
  { key: "root-canal", label: "Root Canal", color: "#C88A75" },
  { key: "filling",    label: "Filling",    color: "#2D9CDB" },
  { key: "crown",      label: "Crown",      color: "#2F80ED" },
  { key: "veneer",     label: "Veneer",     color: "#56CCF2" },
  { key: "implant",    label: "Implant",    color: "#4F4F4F" },
];

export const CONDITION_COLOR = Object.fromEntries(
  TOOTH_CONDITIONS.map((c) => [c.key, c.color])
);

// FDI numbering — permanent dentition
export const FDI_PERMANENT = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft:  [21, 22, 23, 24, 25, 26, 27, 28],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
  lowerLeft:  [31, 32, 33, 34, 35, 36, 37, 38],
};

// FDI numbering — deciduous dentition
export const FDI_DECIDUOUS = {
  upperRight: [55, 54, 53, 52, 51],
  upperLeft:  [61, 62, 63, 64, 65],
  lowerRight: [85, 84, 83, 82, 81],
  lowerLeft:  [71, 72, 73, 74, 75],
};

export function fmtDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
