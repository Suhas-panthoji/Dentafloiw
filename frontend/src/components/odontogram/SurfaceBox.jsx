import React from "react";
import { CONDITION_COLORS, SURFACE_CONDITIONS, surfaceLabel } from "./toothConfig";

const WHOLE_TOOTH_FILL = {
  CROWN: CONDITION_COLORS.CROWN,
  BRIDGE: CONDITION_COLORS.BRIDGE,
  IMPLANT: CONDITION_COLORS.IMPLANT,
};

/**
 * Five-surface diagram (occlusal view) for one tooth.
 * The outer edge is buccal, the edge facing the chart's centre is lingual/palatal,
 * the side facing the midline is mesial and the centre is occlusal/incisal.
 */
export default function SurfaceBox({ tooth, condition = "HEALTHY", surfaces = [], onSurfaceClick, readOnly }) {
  const { x, y, size: S } = tooth.box;
  const a = S * 0.29;
  const upper = tooth.row === "upper";
  const mesialOnRight = !tooth.mirror;

  const regions = {
    [upper ? "buccal" : "lingual"]: `${x},${y} ${x + S},${y} ${x + S - a},${y + a} ${x + a},${y + a}`,
    [upper ? "lingual" : "buccal"]: `${x},${y + S} ${x + S},${y + S} ${x + S - a},${y + S - a} ${x + a},${y + S - a}`,
    [mesialOnRight ? "distal" : "mesial"]: `${x},${y} ${x + a},${y + a} ${x + a},${y + S - a} ${x},${y + S}`,
    [mesialOnRight ? "mesial" : "distal"]: `${x + S},${y} ${x + S - a},${y + a} ${x + S - a},${y + S - a} ${x + S},${y + S}`,
    occlusal: `${x + a},${y + a} ${x + S - a},${y + a} ${x + S - a},${y + S - a} ${x + a},${y + S - a}`,
  };

  const fillFor = (key) => {
    if (WHOLE_TOOTH_FILL[condition]) return { fill: WHOLE_TOOTH_FILL[condition], opacity: 1 };
    if (condition === "RCT") return key === "occlusal" ? { fill: CONDITION_COLORS.RCT, opacity: 1 } : null;
    if (SURFACE_CONDITIONS.has(condition)) {
      if (surfaces.length === 0) return { fill: CONDITION_COLORS[condition], opacity: 0.35 };
      if (surfaces.includes(key)) return { fill: CONDITION_COLORS[condition], opacity: 1 };
    }
    return null;
  };

  return (
    <g className="odont-surface-box" data-testid={`surface-box-${tooth.number}`}>
      {Object.entries(regions).map(([key, points]) => {
        const f = fillFor(key);
        return (
          <polygon
            key={key}
            points={points}
            className={readOnly ? undefined : "odont-surf"}
            fill={f ? f.fill : "#FFFFFF"}
            fillOpacity={f ? f.opacity : 1}
            stroke="#8A7E70"
            strokeWidth="1"
            strokeLinejoin="round"
            data-surface={key}
            onClick={(e) => {
              e.stopPropagation();
              if (!readOnly) onSurfaceClick?.(tooth.number, e, key);
            }}
          >
            <title>{`${tooth.number} · ${surfaceLabel(key, tooth.number).full}`}</title>
          </polygon>
        );
      })}
      {condition === "MISSING" && (
        <g stroke="#3F3F46" strokeWidth="2" strokeLinecap="round" pointerEvents="none">
          <line x1={x + 4} y1={y + 4} x2={x + S - 4} y2={y + S - 4} />
          <line x1={x + S - 4} y1={y + 4} x2={x + 4} y2={y + S - 4} />
        </g>
      )}
    </g>
  );
}
