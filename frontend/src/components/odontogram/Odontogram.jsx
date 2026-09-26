import React, { useMemo, useState, useCallback, useId } from "react";
import Tooth from "./Tooth";
import SurfaceBox from "./SurfaceBox";
import ToothPopup from "./ToothPopup";
import ToothContextMenu from "./ToothContextMenu";
import {
  CONDITION_LEGEND,
  buildArchLayout,
  inferDentition,
  normalizeCondition,
  normalizeTeethRecords,
  recordsToConditionMap,
} from "./toothConfig";

const DENTITION_MODES = [
  { key: "permanent", label: "Permanent — 32 teeth" },
  { key: "deciduous", label: "Deciduous — 20 teeth" },
  { key: "mixed",     label: "Mixed" },
];

const CHART_SETS = {
  permanent: ["permanent"],
  deciduous: ["deciduous"],
  mixed: ["permanent", "deciduous"],
};

function sortTeeth(numbers) {
  return numbers.slice().sort((a, b) => Number(a) - Number(b));
}

function upsertRecord(records, tooth, condition, surfaces = [], treatedElsewhere = undefined) {
  const norm = normalizeCondition(condition);
  const without = records.filter((r) => r.tooth !== tooth);
  const existing = records.find((r) => r.tooth === tooth);
  const finalTreatedElsewhere = treatedElsewhere !== undefined
    ? treatedElsewhere
    : (existing ? existing.treatedElsewhere : false);
  const treatedThisVisit = existing ? existing.treatedThisVisit : false;
  return [
    ...without,
    { tooth, condition: norm, surfaces, treatedThisVisit, treatedElsewhere: finalTreatedElsewhere },
  ].sort((a, b) => Number(a.tooth) - Number(b.tooth));
}

/** Gradients and filters shared by every tooth in one chart. */
function ChartDefs({ uid }) {
  const hStops = (id, stops) => (
    <linearGradient id={`${uid}-${id}`} x1="0" y1="0" x2="1" y2="0">
      {stops.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
    </linearGradient>
  );
  return (
    <defs>
      {hStops("enamel", [[0, "#C8BCAA"], [0.14, "#E9E2D6"], [0.42, "#FFFFFF"], [0.6, "#FBF8F2"], [0.86, "#E2D9CA"], [1, "#BCAF9C"]])}
      {hStops("dentin", [[0, "#B8A487"], [0.18, "#D9CBB2"], [0.45, "#F0E6D3"], [0.72, "#E2D3BA"], [1, "#AE9A7C"]])}
      {hStops("root-back", [[0, "#B3A184"], [0.5, "#D2C4AA"], [1, "#AA977A"]])}
      {hStops("gold", [[0, "#8F6B1E"], [0.2, "#D4A843"], [0.45, "#FFF0B3"], [0.6, "#E8C35A"], [0.85, "#B8892A"], [1, "#7D5B14"]])}
      {hStops("silver", [[0, "#64748B"], [0.25, "#CBD5E1"], [0.5, "#F8FAFC"], [0.75, "#94A3B8"], [1, "#475569"]])}
      {hStops("titanium", [[0, "#374151"], [0.3, "#9CA3AF"], [0.5, "#E5E7EB"], [0.7, "#9CA3AF"], [1, "#374151"]])}
      <linearGradient id={`${uid}-cervical-shade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="0.65" stopColor="#A89274" stopOpacity="0.04" />
        <stop offset="1" stopColor="#A89274" stopOpacity="0.3" />
      </linearGradient>
      <linearGradient id={`${uid}-root-shade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8C7556" stopOpacity="0.12" />
        <stop offset="0.35" stopColor="#8C7556" stopOpacity="0" />
        <stop offset="1" stopColor="#8C7556" stopOpacity="0.22" />
      </linearGradient>
      <radialGradient id={`${uid}-gloss`} cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`${uid}-decay`} cx="0.5" cy="0.45" r="0.55">
        <stop offset="0" stopColor="#1F0D04" />
        <stop offset="0.55" stopColor="#4A2210" />
        <stop offset="1" stopColor="#7A4122" />
      </radialGradient>
      <radialGradient id={`${uid}-filling`} cx="0.38" cy="0.32" r="0.7">
        <stop offset="0" stopColor="#BFDBFE" />
        <stop offset="0.45" stopColor="#3B82F6" />
        <stop offset="1" stopColor="#1E40AF" />
      </radialGradient>
      <filter id={`${uid}-shadow`} x="-5%" y="-5%" width="110%" height="115%">
        <feDropShadow dx="0" dy="1.2" stdDeviation="1.4" floodColor="#3B2F25" floodOpacity="0.28" />
      </filter>
    </defs>
  );
}

/** One SVG chart (permanent or deciduous) with both arches. */
function ArchChart({ set, uid, conditionMap, popupTooth, treatedTeeth, readOnly, onToothClick, onContextMenu }) {
  const layout = useMemo(() => buildArchLayout(set), [set]);
  const rows = [layout.upper, layout.lower];

  const connectors = [];
  rows.forEach((row) => {
    for (let i = 0; i < row.length - 1; i++) {
      const a = row[i];
      const b = row[i + 1];
      if (conditionMap[a.number]?.condition !== "BRIDGE" || conditionMap[b.number]?.condition !== "BRIDGE") continue;
      const crownH = Math.min(a.shape.H, b.shape.H) * a.scale;
      const barH = Math.max(crownH * 0.18, 5);
      const y = a.row === "upper" ? a.yOcc - crownH * 0.5 - barH / 2 : a.yOcc + crownH * 0.5 - barH / 2;
      connectors.push(
        <rect key={`${a.number}-${b.number}`} x={a.x} y={y} width={b.x - a.x} height={barH} rx={barH / 2}
          fill={`url(#${uid}-silver)`} stroke="#475569" strokeWidth="1" pointerEvents="none" />
      );
    }
  });

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="odont-svg"
      role="img"
      aria-label={`FDI odontogram — ${set} teeth`}
      data-testid={`odontogram-${set}`}
    >
      <ChartDefs uid={uid} />
      <rect x="0" y="0" width={layout.width} height={layout.height} className="odont-chart-bg" rx="12" />

      {/* Guides: bite line between the jaws and the midline between left and right */}
      <g className="odont-guide" pointerEvents="none">
        <line x1={layout.upper[0].x - 30} y1={layout.midY} x2={layout.upper[layout.upper.length - 1].x + 30} y2={layout.midY} />
        <line x1={layout.midX} y1={layout.guideTop} x2={layout.midX} y2={layout.guideBottom} />
      </g>

      <text x="32" y={layout.midY + 9} textAnchor="middle" className="odont-rl-label">R</text>
      <text x={layout.width - 32} y={layout.midY + 9} textAnchor="middle" className="odont-rl-label">L</text>

      {rows.map((row) => row.map((t) => {
        const data = conditionMap[t.number] || {};
        return (
          <g key={`meta-${t.number}`}>
            <text x={t.x} y={t.numY} textAnchor="middle" className="odont-tooth-num">{t.number}</text>
            <SurfaceBox
              tooth={t}
              condition={data.condition || "HEALTHY"}
              surfaces={data.surfaces || []}
              readOnly={readOnly}
              onSurfaceClick={onToothClick}
            />
          </g>
        );
      }))}

      {rows.map((row, ri) => (
        <g key={ri} filter={`url(#${uid}-shadow)`}>
          {row.map((t) => {
            const data = conditionMap[t.number] || {};
            return (
              <Tooth
                key={t.number}
                tooth={t}
                uid={uid}
                condition={data.condition || "HEALTHY"}
                surfaces={data.surfaces || []}
                isSelected={popupTooth === t.number}
                treatedThisVisit={treatedTeeth.has(t.number)}
                treatedElsewhere={data.treatedElsewhere || false}
                onClick={onToothClick}
                onContextMenu={onContextMenu}
              />
            );
          })}
        </g>
      ))}

      {connectors}
    </svg>
  );
}

function SurfaceKey() {
  const S = 44;
  const x = 8;
  const y = 8;
  const a = S * 0.29;
  const poly = (pts) => <polygon points={pts} fill="#FFFFFF" stroke="#8A7E70" strokeWidth="1" />;
  return (
    <svg viewBox="0 0 60 60" width="60" height="60" aria-hidden="true" className="odont-surface-key-svg">
      {poly(`${x},${y} ${x + S},${y} ${x + S - a},${y + a} ${x + a},${y + a}`)}
      {poly(`${x},${y + S} ${x + S},${y + S} ${x + S - a},${y + S - a} ${x + a},${y + S - a}`)}
      {poly(`${x},${y} ${x + a},${y + a} ${x + a},${y + S - a} ${x},${y + S}`)}
      {poly(`${x + S},${y} ${x + S - a},${y + a} ${x + S - a},${y + S - a} ${x + S},${y + S}`)}
      {poly(`${x + a},${y + a} ${x + S - a},${y + a} ${x + S - a},${y + S - a} ${x + a},${y + S - a}`)}
      <g className="odont-surface-key-text" textAnchor="middle">
        <text x={x + S / 2} y={y + a - 3}>B</text>
        <text x={x + S / 2} y={y + S - 3}>L</text>
        <text x={x + a / 2} y={y + S / 2 + 3}>D</text>
        <text x={x + S - a / 2} y={y + S / 2 + 3}>M</text>
        <text x={x + S / 2} y={y + S / 2 + 3}>O</text>
      </g>
    </svg>
  );
}

export default function Odontogram({ value, onChange, readOnly = false, defaultDentition }) {
  const records = useMemo(() => normalizeTeethRecords(value), [value]);
  const conditionMap = useMemo(() => recordsToConditionMap(records), [records]);
  const uid = `od${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const [localDentition, setLocalDentition] = useState(null);
  const dentition = localDentition || value?.dentition || inferDentition(records) || defaultDentition || "permanent";

  const [treatedTeeth, setTreatedTeeth] = useState(new Set());
  const [popup, setPopup] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);

  const treatedList = useMemo(
    () => sortTeeth(Array.from(treatedTeeth)).join(", "),
    [treatedTeeth]
  );

  // ── Emit change ────────────────────────────────────────────────────
  const emitChange = useCallback(
    (nextRecords, changedTooth, condition, surfaces = []) => {
      const base = value || {};
      // Keep a copy of charts saved in the old per-surface format before replacing them.
      const legacy = base.teeth && !Array.isArray(base.teeth) && Object.keys(base.teeth).length > 0 && !base.legacy_teeth
        ? { legacy_teeth: base.teeth }
        : {};
      const history = [
        ...(base.history || []),
        {
          date: new Date().toISOString(),
          tooth: changedTooth,
          condition,
          surfaces,
          changes: { [changedTooth]: [condition] },
        },
      ];
      onChange?.({ ...base, ...legacy, dentition, teeth: nextRecords, history });
    },
    [onChange, value, dentition]
  );

  const changeDentition = (mode) => {
    setLocalDentition(mode);
    if (!readOnly && mode !== dentition) onChange?.({ ...(value || {}), dentition: mode });
  };

  // ── Click handler (opens popup) ────────────────────────────────────
  const handleToothClick = useCallback(
    (toothNumber, event, surface) => {
      if (readOnly) return;
      setCtxMenu(null);
      const rect = event.currentTarget?.getBoundingClientRect
        ? event.currentTarget.getBoundingClientRect()
        : { left: event.clientX, top: event.clientY, width: 0, height: 0 };
      setPopup({
        toothNumber,
        surface: surface || null,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height + 8,
      });
    },
    [readOnly]
  );

  // ── Context menu handler ───────────────────────────────────────────
  const handleContextMenu = useCallback(
    (toothNumber, event) => {
      if (readOnly) return;
      setPopup(null);
      setCtxMenu({
        toothNumber,
        x: event.clientX || event.pageX,
        y: event.clientY || event.pageY,
      });
    },
    [readOnly]
  );

  // ── Popup apply ────────────────────────────────────────────────────
  const handleApply = useCallback(
    (toothNumber, condition, surfaces, treatedElsewhere) => {
      const nextRecords = upsertRecord(records, toothNumber, condition, surfaces, treatedElsewhere);
      emitChange(nextRecords, toothNumber, normalizeCondition(condition), surfaces);
    },
    [records, emitChange]
  );

  // ── Mark treated this visit ────────────────────────────────────────
  const handleMarkTreated = useCallback((toothNumber) => {
    setTreatedTeeth((prev) => {
      const next = new Set(prev);
      if (next.has(toothNumber)) next.delete(toothNumber);
      else next.add(toothNumber);
      return next;
    });
  }, []);

  // ── Context menu action ────────────────────────────────────────────
  const handleCtxAction = useCallback(
    (toothNumber, action) => {
      if (action === "clear") {
        emitChange(records.filter((r) => r.tooth !== toothNumber), toothNumber, "CLEARED");
        return;
      }
      const missing = action === "missing";
      const condition = missing ? "MISSING" : "HEALTHY";
      // Marking missing keeps any "treated elsewhere" flag; marking healthy clears it.
      emitChange(upsertRecord(records, toothNumber, condition, [], missing ? undefined : false), toothNumber, condition);
    },
    [records, emitChange]
  );

  // ── Copy treated teeth ─────────────────────────────────────────────
  const copyTreated = () => {
    if (treatedList) {
      navigator.clipboard?.writeText(treatedList);
    }
  };

  // ── Clear all selections ───────────────────────────────────────────
  const clearAll = () => {
    setTreatedTeeth(new Set());
    setPopup(null);
    setCtxMenu(null);
  };

  return (
    <div className="odont-wrapper" data-testid="odontogram">
      {/* Dentition Toggle */}
      <div className="odont-toggle-bar">
        {DENTITION_MODES.map((mode) => (
          <button
            key={mode.key}
            type="button"
            className={`odont-toggle-btn ${dentition === mode.key ? "active" : ""}`}
            onClick={() => changeDentition(mode.key)}
            data-testid={`dentition-${mode.key}`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="odont-main-row">
        {/* Chart area */}
        <div className="odont-charts">
          {CHART_SETS[dentition].map((set) => (
            <div className="odont-chart-area" key={set}>
              {dentition === "mixed" && (
                <div className="odont-chart-caption">{set === "permanent" ? "Permanent teeth" : "Deciduous teeth"}</div>
              )}
              <div className="odont-chart-scroll">
                <ArchChart
                  set={set}
                  uid={`${uid}-${set}`}
                  conditionMap={conditionMap}
                  popupTooth={popup?.toothNumber}
                  treatedTeeth={treatedTeeth}
                  readOnly={readOnly}
                  onToothClick={handleToothClick}
                  onContextMenu={handleContextMenu}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Condition panel (right side) */}
        {!readOnly && (
          <div className="odont-panel">
            <h4 className="odont-panel-title">Tooth Conditions</h4>

            {/* Legend */}
            <div className="odont-legend">
              {CONDITION_LEGEND.map((item) => (
                <div key={item.key} className="odont-legend-row">
                  <span
                    className={`odont-legend-swatch ${item.cross ? "cross" : ""}`}
                    style={{
                      backgroundColor: item.swatch,
                      borderColor: item.border,
                    }}
                  />
                  <span className="odont-legend-label">{item.label}</span>
                </div>
              ))}
            </div>

            {/* Surface box key */}
            <div className="odont-panel-section odont-surface-key">
              <div className="odont-panel-label">Surface Boxes</div>
              <div className="odont-surface-key-body">
                <SurfaceKey />
                <div className="odont-surface-key-note">
                  Centre: occlusal / incisal. Outer edge: buccal. Edge facing the centre: lingual / palatal. M faces the midline.
                </div>
              </div>
            </div>

            {/* Selected for this visit */}
            <div className="odont-panel-section">
              <div className="odont-panel-label">Selected Teeth for This Visit:</div>
              <div className="odont-panel-value" data-testid="selected-teeth">
                {treatedList || "None"}
                {treatedList && (
                  <button
                    type="button"
                    className="odont-copy-btn"
                    onClick={copyTreated}
                    title="Copy to clipboard"
                  >
                    📋
                  </button>
                )}
              </div>
            </div>

            <button
              type="button"
              className="odont-clear-btn"
              onClick={clearAll}
              disabled={treatedTeeth.size === 0}
            >
              Clear All Selections
            </button>
          </div>
        )}
      </div>

      {/* Popup */}
      {popup && (
        <ToothPopup
          key={`${popup.toothNumber}-${popup.surface || ""}`}
          toothNumber={popup.toothNumber}
          currentCondition={
            conditionMap[popup.toothNumber]?.condition || "HEALTHY"
          }
          currentSurfaces={
            conditionMap[popup.toothNumber]?.surfaces || []
          }
          initialSurface={popup.surface}
          treatedThisVisit={treatedTeeth.has(popup.toothNumber)}
          position={{ x: popup.x, y: popup.y }}
          onApply={handleApply}
          onMarkTreated={handleMarkTreated}
          onClose={() => setPopup(null)}
          readOnly={readOnly}
        />
      )}

      {/* Context menu */}
      {ctxMenu && (
        <ToothContextMenu
          toothNumber={ctxMenu.toothNumber}
          position={{ x: ctxMenu.x, y: ctxMenu.y }}
          onAction={handleCtxAction}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
