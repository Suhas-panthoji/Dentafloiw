import React, { useRef, useEffect } from "react";

/**
 * Right-click context menu for a tooth.
 *
 * Props:
 *   toothNumber – e.g. "36"
 *   position    – { x, y } in page coordinates
 *   onAction    – (toothNumber, action) => void   action: "missing" | "healthy" | "clear"
 *   onClose     – () => void
 */
export default function ToothContextMenu({
  toothNumber,
  position,
  onAction,
  onClose,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const items = [
    { key: "missing", label: "Mark as Missing",  icon: "✕" },
    { key: "healthy", label: "Mark as Healthy",  icon: "♡" },
    { key: "clear",   label: "Clear Condition",  icon: "⟳" },
  ];

  const style = {
    position: "fixed",
    left: Math.min(position?.x || 0, window.innerWidth - 200),
    top: Math.min(position?.y || 0, window.innerHeight - 160),
    zIndex: 1001,
  };

  return (
    <div ref={ref} className="odont-ctx-menu" style={style}>
      <div className="odont-ctx-header">Tooth {toothNumber}</div>
      {items.map((item) => (
        <button
          key={item.key}
          className="odont-ctx-item"
          onClick={() => {
            onAction?.(toothNumber, item.key);
            onClose?.();
          }}
          type="button"
        >
          <span className="odont-ctx-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}
