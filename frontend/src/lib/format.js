// shared constants and helpers

export const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh",
  "Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
  "Andaman & Nicobar","Chandigarh","Dadra & Nagar Haveli","Daman & Diu","Delhi","Jammu & Kashmir","Ladakh","Lakshadweep","Puducherry",
];

export const DISEASES = [
  "Diabetes","Hypertension (High BP)","Cancer","Thyroid Disorder","Heart Disease","Asthma","Epilepsy",
  "Hepatitis B","Hepatitis C","HIV/AIDS","Kidney Disease","Liver Disease","Osteoporosis","Arthritis","Other",
];

export const ORAL_CONDITIONS = [
  "Gingivitis","Periodontitis","Dry Mouth","Oral Ulcers","Bad Breath","Bruxism","TMJ Disorder",
  "Oral Cancer (Suspected)","Fluorosis","Hypersensitivity","Other",
];

export const SOFT_TISSUES = [
  "Salivary Glands","Oral Mucosa","Palate (Hard & Soft)","Occlusion","Gingiva (Gums)","Tongue","Lips",
];

export const HYGIENE_LEVELS = ["Poor", "Fair", "Good", "Excellent"];
export const OCCLUSION_CLASSES = ["Class I", "Class II", "Class III"];

export const TREATMENT_TYPES = [
  "Cleaning","Scaling","Extraction","Filling (Composite)","Filling (Amalgam)","Root Canal Treatment",
  "Crown (Metal/Ceramic/Zirconia)","Bridge","Implant","Denture","Whitening","Orthodontic Adjustment",
  "Radiology/X-Ray","Consultation","Other",
];

export const COMMON_DRUGS = [
  "Amoxicillin","Augmentin","Ibuprofen","Paracetamol","Metronidazole","Chlorhexidine Mouthwash",
  "Diclofenac","Ketorolac","Cefixime","Clindamycin","Aceclofenac","Pantoprazole",
];

export const FREQUENCIES = ["Once daily","Twice daily","Thrice daily","As needed","Weekly"];
export const PRX_FREQ = ["Once daily","Twice daily","Thrice daily","SOS"];
export const DURATIONS = ["3 days","5 days","7 days","10 days","Custom"];
export const SPECIAL_INSTR = ["Before food","After food","With water","At bedtime"];
export const REFERRAL_SOURCES = ["Walk-in","Friend or Family","Google","Doctor Referral","Social Media","Other"];

export const TOOTH_CONDITIONS = [
  { key: "healthy",  label: "Healthy",  color: "#FFFFFF" },
  { key: "cavity",   label: "Cavity",   color: "#EF4444" },
  { key: "filling",  label: "Filling",  color: "#3B82F6" },
  { key: "crown",    label: "Crown",    color: "#FBBF24" },
  { key: "rct",      label: "Root Canal", color: "#8B5CF6" },
  { key: "missing",  label: "Missing",  color: "#9CA3AF" },
  { key: "implant",  label: "Implant",  color: "#0A6E6E" },
  { key: "planned",  label: "Planned",  color: "#BAE6FD" },
  { key: "bridge",   label: "Bridge",   color: "#F472B6" },
  { key: "veneer",   label: "Veneer",   color: "#C7D2FE" },
  { key: "fractured",label: "Fractured",color: "#F97316" },
  { key: "impacted", label: "Impacted", color: "#A78BFA" },
];

export const CONDITION_COLOR = Object.fromEntries(TOOTH_CONDITIONS.map((c) => [c.key, c.color]));

// FDI numbering
export const FDI_PERMANENT = {
  upperRight: [18,17,16,15,14,13,12,11],
  upperLeft:  [21,22,23,24,25,26,27,28],
  lowerRight: [48,47,46,45,44,43,42,41],
  lowerLeft:  [31,32,33,34,35,36,37,38],
};
export const FDI_DECIDUOUS = {
  upperRight: [55,54,53,52,51],
  upperLeft:  [61,62,63,64,65],
  lowerRight: [85,84,83,82,81],
  lowerLeft:  [71,72,73,74,75],
};

export function inr(n) {
  const v = Math.round(Number(n || 0));
  return "₹" + v.toLocaleString("en-IN");
}

export function calcAge(dob) {
  if (!dob) return "";
  const d = new Date(dob);
  if (isNaN(d)) return "";
  const t = new Date();
  let a = t.getFullYear() - d.getFullYear();
  const m = t.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
  return a;
}

export function fmtDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function fullName(p) {
  return `${p?.general?.first_name || p?.first_name || ""} ${p?.general?.last_name || p?.last_name || ""}`.trim() || "Unnamed";
}
