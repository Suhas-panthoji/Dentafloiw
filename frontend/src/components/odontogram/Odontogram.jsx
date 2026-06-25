import React, { useMemo, useState, useCallback, useRef } from "react";
import Tooth from "./Tooth";
import ToothPopup from "./ToothPopup";
import ToothContextMenu from "./ToothContextMenu";
import {
  CONDITION_LEGEND,
  CONDITION_OPTIONS,
  getPermanentLayout,
  getDeciduousLayout,
  normalizeCondition,
  normalizeTeethRecords,
  recordsToConditionMap,
  conditionLabel,
} from "./toothConfig";

const DENTITION_MODES = [
  { key: "permanent", label: "Permanent — 32 teeth" },
  { key: "deciduous", label: "Deciduous — 20 teeth" },
  { key: "mixed",     label: "Mixed" },
];

function sortTeeth(numbers) {
  return numbers.slice().sort((a, b) => Number(a) - Number(b));
}

function upsertRecord(records, tooth, condition, surfaces = []) {
  const norm = normalizeCondition(condition);
  const without = records.filter((r) => r.tooth !== tooth);
  return [
    ...without,
    { tooth, condition: norm, surfaces, treatedThisVisit: false },
  ].sort((a, b) => Number(a.tooth) - Number(b.tooth));
}

export default function Odontogram({ value, onChange, readOnly = false }) {
  const records = useMemo(() => normalizeTeethRecords(value), [value]);
  const conditionMap = useMemo(() => recordsToConditionMap(records), [records]);

  const [dentition, setDentition] = useState("permanent");
  const [treatedTeeth, setTreatedTeeth] = useState(new Set());
  const [popup, setPopup] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const svgRef = useRef(null);

  const layout = useMemo(() => {
    if (dentition === "deciduous") return getDeciduousLayout();
    return getPermanentLayout(); // permanent and mixed share permanent layout
  }, [dentition]);

  const upperTeeth = useMemo(() => layout.filter((t) => t.row === "upper"), [layout]);
  const lowerTeeth = useMemo(() => layout.filter((t) => t.row === "lower"), [layout]);

  const treatedList = useMemo(
    () => sortTeeth(Array.from(treatedTeeth)).join(", "),
    [treatedTeeth]
  );

  // ── Emit change ────────────────────────────────────────────────────
  const emitChange = useCallback(
    (nextRecords, changedTooth, condition) => {
      const history = [
        ...(value?.history || []),
        {
          date: new Date().toISOString(),
          condition,
          changes: { [changedTooth]: [condition] },
        },
      ];
      onChange?.({ ...(value || {}), teeth: nextRecords, history });
    },
    [onChange, value]
  );

  // ── Click handler (opens popup) ────────────────────────────────────
  const handleToothClick = useCallback(
    (toothNumber, event) => {
      if (readOnly) return;
      setCtxMenu(null);

      // Get position for the popup
      const rect = event.currentTarget
        ? event.currentTarget.getBoundingClientRect()
        : { left: event.clientX, top: event.clientY, height: 0 };

      setPopup({
        toothNumber,
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
    (toothNumber, condition, surfaces) => {
      const nextRecords = upsertRecord(records, toothNumber, condition, surfaces);
      emitChange(nextRecords, toothNumber, normalizeCondition(condition));
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
      let condition = "HEALTHY";
      if (action === "missing") condition = "MISSING";
      const nextRecords = upsertRecord(records, toothNumber, condition);
      emitChange(nextRecords, toothNumber, condition);
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

  // SVG dimensions
  const svgW = 1280;
  const svgH = 540;

  return (
    <div className="odont-wrapper" data-testid="odontogram">
      {/* Dentition Toggle */}
      <div className="odont-toggle-bar">
        {DENTITION_MODES.map((mode) => (
          <button
            key={mode.key}
            type="button"
            className={`odont-toggle-btn ${dentition === mode.key ? "active" : ""}`}
            onClick={() => setDentition(mode.key)}
          >
            {mode.label}
          </button>
        ))}
      </div>

      <div className="odont-main-row">
        {/* Chart area */}
        <div className="odont-chart-area">
          <div className="odont-chart-scroll">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="odont-svg"
              role="img"
              aria-label="FDI odontogram tooth chart"
            >
              {/* Warm cream background */}
              <rect x="0" y="0" width={svgW} height={svgH} fill="#EDE8E0" rx="12" />

              {/* R and L labels */}
              <text x="38" y={svgH / 2 + 6} textAnchor="middle" className="odont-rl-label">
                R
              </text>
              <text x={svgW - 38} y={svgH / 2 + 6} textAnchor="middle" className="odont-rl-label">
                L
              </text>

              {/* Upper tooth numbers */}
              {upperTeeth.map((t) => (
                <text
                  key={`num-${t.number}`}
                  x={t.x}
                  y={t.labelY}
                  textAnchor="middle"
                  className="odont-tooth-num"
                >
                  {t.number}
                </text>
              ))}

              {/* Upper teeth */}
              {upperTeeth.map((t) => {
                const data = conditionMap[t.number] || {};
                return (
                  <Tooth
                    key={t.number}
                    tooth={t}
                    condition={data.condition || "HEALTHY"}
                    surfaces={data.surfaces || []}
                    isSelected={popup?.toothNumber === t.number}
                    treatedThisVisit={treatedTeeth.has(t.number)}
                    onClick={handleToothClick}
                    onContextMenu={handleContextMenu}
                  />
                );
              })}

              {/* Lower teeth */}
              {lowerTeeth.map((t) => {
                const data = conditionMap[t.number] || {};
                return (
                  <Tooth
                    key={t.number}
                    tooth={t}
                    condition={data.condition || "HEALTHY"}
                    surfaces={data.surfaces || []}
                    isSelected={popup?.toothNumber === t.number}
                    treatedThisVisit={treatedTeeth.has(t.number)}
                    onClick={handleToothClick}
                    onContextMenu={handleContextMenu}
                  />
                );
              })}

              {/* Lower tooth numbers */}
              {lowerTeeth.map((t) => (
                <text
                  key={`num-${t.number}`}
                  x={t.x}
                  y={t.labelY}
                  textAnchor="middle"
                  className="odont-tooth-num"
                >
                  {t.number}
                </text>
              ))}
            </svg>
          </div>
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
                    className="odont-legend-swatch"
                    style={{
                      backgroundColor: item.swatch,
                      borderColor: item.border,
                    }}
                  />
                  <span className="odont-legend-label">{item.label}</span>
                </div>
              ))}
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
          toothNumber={popup.toothNumber}
          currentCondition={
            conditionMap[popup.toothNumber]?.condition || "HEALTHY"
          }
          currentSurfaces={
            conditionMap[popup.toothNumber]?.surfaces || []
          }
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
