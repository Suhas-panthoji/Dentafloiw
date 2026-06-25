import React, { useState, useRef, useEffect } from "react";
import {
  CONDITION_OPTIONS,
  CONDITION_COLORS,
  SURFACE_OPTIONS,
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
 *   onApply           – (toothNumber, condition, surfaces) => void
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
  const [surfaces, setSurfaces] = useState(new Set(currentSurfaces));
  const ref = useRef(null);

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

  const handleApply = () => {
    onApply?.(toothNumber, condition, Array.from(surfaces));
    onClose?.();
  };

  const handleMarkTreated = () => {
    onMarkTreated?.(toothNumber);
  };

  // Position the popup
  const style = {
    position: "fixed",
    left: Math.min(position?.x || 0, window.innerWidth - 320),
    top: Math.min(position?.y || 0, window.innerHeight - 400),
    zIndex: 1000,
  };

  return (
    <div ref={ref} className="odont-popup" style={style}>
      {/* Header */}
      <div className="odont-popup-header">
        <div>
          <div className="odont-popup-tooth-num">Tooth {toothNumber}</div>
          <div className="odont-popup-tooth-name">{toothName(toothNumber)}</div>
        </div>
        <button className="odont-popup-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      {/* Current condition */}
      <div className="odont-popup-current">
        <span
          className="odont-popup-swatch"
          style={{ backgroundColor: CONDITION_COLORS[currentCondition] }}
        />
        Current: {conditionLabel(currentCondition)}
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
            <div className="odont-popup-surfaces">
              {SURFACE_OPTIONS.map((s) => (
                <button
                  key={s.key}
                  className={`odont-popup-surf-btn ${
                    surfaces.has(s.key) ? "active" : ""
                  }`}
                  onClick={() => toggleSurface(s.key)}
                  type="button"
                  title={s.fullLabel}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="odont-popup-actions">
            <button
              className="odont-popup-apply"
              onClick={handleApply}
              type="button"
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
