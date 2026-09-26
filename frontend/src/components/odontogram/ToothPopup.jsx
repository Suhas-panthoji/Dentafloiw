import React, { useState, useRef, useEffect } from "react";
import {
  CONDITION_OPTIONS,
  CONDITION_COLORS,
  SURFACE_OPTIONS,
  SURFACE_CONDITIONS,
  TREATMENT_CONDITIONS,
  surfaceLabel,
  toothName,
  conditionLabel,
} from "./toothConfig";

/**
 * Popup card that appears when a tooth is clicked.
 *
 * Props:
 *   toothNumber       – e.g. "36"
 *   currentCondition  – e.g. "HEALTHY"
 *   currentSurfaces   – ["occlusal", ...]
 *   treatedThisVisit  – boolean
 *   position          – { x, y } in page coordinates
 *   onApply           – (toothNumber, condition, surfaces, treatedElsewhere) => void
 *   onMarkTreated     – (toothNumber) => void
 *   onClose           – () => void
 *   readOnly          – boolean
 */
export default function ToothPopup({
  toothNumber,
  currentCondition = "HEALTHY",
  currentSurfaces = [],
  treatedThisVisit = false,
  position,
  onApply,
  onMarkTreated,
  onClose,
  readOnly = false,
}) {
  const [condition, setCondition] = useState(currentCondition);
  const [surfaces, setSurfaces] = useState(() => new Set(currentSurfaces));
  const [askingTreated, setAskingTreated] = useState(false);
  const ref = useRef(null);
  const usesSurfaces = SURFACE_CONDITIONS.has(condition);

  // Position the popup
  const style = {
    position: "fixed",
    left: Math.max(8, Math.min(position?.x || 0, window.innerWidth - 320)),
    top: Math.max(8, Math.min(position?.y || 0, window.innerHeight - 440)),
    zIndex: 1000,
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggleSurface = (s) => {
    setSurfaces((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const appliedSurfaces = () =>
    usesSurfaces ? SURFACE_OPTIONS.map((s) => s.key).filter((k) => surfaces.has(k)) : [];

  const apply = (treatedElsewhere) => {
    onApply?.(toothNumber, condition, appliedSurfaces(), treatedElsewhere);
    onClose?.();
  };

  // Only treatments can have been done at another clinic; skip the question otherwise.
  const handleApply = () => {
    if (TREATMENT_CONDITIONS.has(condition)) setAskingTreated(true);
    else apply(false);
  };

  const handleMarkTreated = () => {
    onMarkTreated?.(toothNumber);
  };

  const header = (
    <div className="odont-popup-header">
      <div>
        <div className="odont-popup-tooth-num">Tooth {toothNumber}</div>
        <div className="odont-popup-tooth-name">{toothName(toothNumber)}</div>
      </div>
      <button className="odont-popup-close" onClick={onClose} aria-label="Close">
        ×
      </button>
    </div>
  );

  if (askingTreated) {
    return (
      <div ref={ref} className="odont-popup" style={style} data-testid="tooth-popup">
        {header}
        <div className="odont-popup-section" style={{ padding: "16px 14px" }}>
          <div className="odont-popup-question">
            Was this treated before at another clinic or hospital?
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="odont-popup-apply" onClick={() => apply(true)} type="button">
              Yes
            </button>
            <button className="odont-popup-apply secondary" onClick={() => apply(false)} type="button">
              No
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentSurfaceText = currentSurfaces.length
    ? ` — ${currentSurfaces.map((s) => surfaceLabel(s, toothNumber).full).join(", ")}`
    : "";

  return (
    <div ref={ref} className="odont-popup" style={style} data-testid="tooth-popup">
      {header}

      {/* Current condition */}
      <div className="odont-popup-current">
        <span
          className="odont-popup-swatch"
          style={{ backgroundColor: CONDITION_COLORS[currentCondition] }}
        />
        Current: {conditionLabel(currentCondition)}{currentSurfaceText}
      </div>

      {!readOnly && (
        <>
          {/* Condition selector */}
          <div className="odont-popup-section">
            <div className="odont-popup-label">Condition</div>
            <div className="odont-popup-conditions">
              {CONDITION_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={`odont-popup-cond-btn ${
                    condition === opt.key ? "active" : ""
                  }`}
                  onClick={() => setCondition(opt.key)}
                  type="button"
                  data-testid={`cond-${opt.key}`}
                >
                  <span
                    className="odont-popup-swatch"
                    style={{ backgroundColor: CONDITION_COLORS[opt.key] }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Surface selector */}
          <div className="odont-popup-section">
            <div className="odont-popup-label">Surface Affected</div>
            <div className={`odont-popup-surfaces ${usesSurfaces ? "" : "disabled"}`}>
              {SURFACE_OPTIONS.map((s) => {
                const lbl = surfaceLabel(s.key, toothNumber);
                return (
                  <button
                    key={s.key}
                    className={`odont-popup-surf-btn ${
                      usesSurfaces && surfaces.has(s.key) ? "active" : ""
                    }`}
                    onClick={() => toggleSurface(s.key)}
                    type="button"
                    title={lbl.full}
                    disabled={!usesSurfaces}
                    data-testid={`surf-${s.key}`}
                  >
                    {lbl.short}
                  </button>
                );
              })}
            </div>
            <div className="odont-popup-hint">
              {usesSurfaces
                ? "Select the affected surfaces. Leave empty if not known."
                : "This condition applies to the whole tooth."}
            </div>
          </div>

          {/* Actions */}
          <div className="odont-popup-actions">
            <button
              className="odont-popup-apply"
              onClick={handleApply}
              type="button"
              data-testid="popup-apply"
            >
              Apply
            </button>
            <button
              className={`odont-popup-treat ${treatedThisVisit ? "active" : ""}`}
              onClick={handleMarkTreated}
              type="button"
            >
              {treatedThisVisit ? "✓ Treated This Visit" : "Mark as Treated This Visit"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
