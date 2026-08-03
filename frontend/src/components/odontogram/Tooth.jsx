import React from "react";
import { getToothPath } from "./toothPaths";
import { CONDITION_COLORS, conditionLabel } from "./toothConfig";

/**
 * Individual tooth SVG component with realistic 3D shading.
 *
 * Props:
 *   tooth       – { number, row, kind, x, y, scale }
 *   condition   – "HEALTHY" | "CAVITY" | etc.
 *   surfaces    – ["occlusal", "mesial", ...]
 *   isSelected  – boolean (selected for this visit)
 *   treatedThisVisit – boolean (teal glow)
 *   onClick     – (toothNumber, event) => void
 *   onContextMenu – (toothNumber, event) => void
 */
export default function Tooth({
  tooth,
  condition = "HEALTHY",
  surfaces = [],
  isSelected,
  treatedThisVisit,
  treatedElsewhere = false,
  onClick,
  onContextMenu,
}) {
  const path = getToothPath(tooth.row, tooth.kind, tooth.number);
  const isMissing = condition === "MISSING";
  const label = `Tooth ${tooth.number} – ${conditionLabel(condition)}`;
  const gradId = `tg-${tooth.number}`;
  const highlightId = `th-${tooth.number}`;
  const condGradId = `tc-${tooth.number}`;

  const handleClick = (e) => {
    e.stopPropagation();
    onClick?.(tooth.number, e);
  };

  const handleContext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(tooth.number, e);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(tooth.number, e);
    }
  };

  // ── Gradients defined per-tooth ────────────────────────────────────
  const renderDefs = () => {
    const isUpper = tooth.row === "upper";
    return (
      <defs>
        {/* Main 3D body gradient */}
        <radialGradient id={gradId} cx="40%" cy={isUpper ? "35%" : "65%"} r="70%" fx="38%" fy={isUpper ? "30%" : "68%"}>
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="30%" stopColor="#F5F0EB" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#D8D0C8" stopOpacity="0.8" />
          <stop offset="80%" stopColor="#B8AEA4" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#8A7A6A" stopOpacity="0.6" />
        </radialGradient>

        {/* Enamel highlight spot */}
        <radialGradient id={highlightId} cx="45%" cy={isUpper ? "55%" : "45%"} r="35%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="50%" stopColor="#F0FAFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        {/* Condition-specific gradient for crown/implant */}
        {condition === "CROWN" && (
          <linearGradient id={condGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E8C860" stopOpacity="0.85" />
            <stop offset="35%" stopColor="#D4A843" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#B8922E" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#A07A20" stopOpacity="0.75" />
          </linearGradient>
        )}
        {condition === "IMPLANT" && (
          <linearGradient id={condGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3A9A9A" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#2A7A7A" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1A5A5A" stopOpacity="0.9" />
          </linearGradient>
        )}
      </defs>
    );
  };

  // ── Condition overlays ─────────────────────────────────────────────
  const renderConditionOverlay = () => {
    switch (condition) {
      case "CAVITY":
        return (
          <path
            d={path.body}
            fill="#C4906A"
            opacity="0.45"
            pointerEvents="none"
          />
        );
      case "FILLING":
        return (
          <path
            d={path.body}
            fill="#E8E4E0"
            opacity="0.5"
            pointerEvents="none"
          />
        );
      case "RCT":
        return (
          <path
            d={path.body}
            fill="rgba(130, 90, 160, 0.3)"
            pointerEvents="none"
          />
        );
      case "CROWN":
        return (
          <path
            d={path.body}
            fill={`url(#${condGradId})`}
            pointerEvents="none"
          />
        );
      case "IMPLANT":
        return (
          <path
            d={path.body}
            fill={`url(#${condGradId})`}
            pointerEvents="none"
          />
        );
      case "FRACTURED":
        return (
          <>
            <path
              d={path.body}
              fill="#E87040"
              opacity="0.35"
              pointerEvents="none"
            />
            {/* Fracture line */}
            <line
              x1="-8"
              y1={tooth.row === "upper" ? "20" : "30"}
              x2="6"
              y2={tooth.row === "upper" ? "70" : "55"}
              stroke="#C45020"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.6"
              pointerEvents="none"
            />
          </>
        );
      case "BRIDGE":
        return (
          <path
            d={path.body}
            fill="#5A8ABF"
            opacity="0.35"
            pointerEvents="none"
          />
        );
      default:
        return null;
    }
  };

  // ── Missing tooth rendering ────────────────────────────────────────
  if (isMissing) {
    const centerY = path.h * 0.45;
    return (
      <g
        id={`tooth${tooth.number}`}
        role="button"
        tabIndex={0}
        aria-label={label}
        data-testid={`tooth-${tooth.number}`}
        transform={`translate(${tooth.x} ${tooth.y}) scale(${tooth.scale})`}
        onClick={handleClick}
        onContextMenu={handleContext}
        onKeyDown={handleKeyDown}
        className="odont-tooth"
      >
        {/* Ghost outline */}
        <path
          d={path.body}
          fill="rgba(150, 140, 130, 0.25)"
          stroke="rgba(120, 110, 100, 0.4)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Bold X mark */}
        <g
          stroke="#2A2420"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.85"
        >
          <line
            x1="-12"
            y1={centerY - 14}
            x2="12"
            y2={centerY + 14}
          />
          <line
            x1="12"
            y1={centerY - 14}
            x2="-12"
            y2={centerY + 14}
          />
        </g>
        {/* Arrow if treated elsewhere */}
        {treatedElsewhere && (
          tooth.row === "upper" ? (
            <g stroke="#000000" fill="#000000" pointerEvents="none">
              <line x1="0" y1="-30" x2="0" y2="-6" strokeWidth="3.5" strokeLinecap="round" />
              <polygon points="-6,-14 0,-4 6,-14" />
            </g>
          ) : (
            <g stroke="#000000" fill="#000000" pointerEvents="none">
              <line x1="0" y1={path.h + 30} x2="0" y2={path.h + 6} strokeWidth="3.5" strokeLinecap="round" />
              <polygon points={`-6,${path.h + 14} 0,${path.h + 4} 6,${path.h + 14}`} />
            </g>
          )
        )}
      </g>
    );
  }

  return (
    <g
      id={`tooth${tooth.number}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      data-testid={`tooth-${tooth.number}`}
      transform={`translate(${tooth.x} ${tooth.y}) scale(${tooth.scale})`}
      onClick={handleClick}
      onContextMenu={handleContext}
      onKeyDown={handleKeyDown}
      className="odont-tooth"
    >
      {renderDefs()}

      {/* Treated this visit → outer teal glow */}
      {treatedThisVisit && (
        <path
          d={path.body}
          fill="none"
          stroke="#0D7A7A"
          strokeWidth="6"
          strokeLinejoin="round"
          opacity="0.5"
          className="odont-glow-pulse"
        />
      )}

      {/* Selected highlight ring */}
      {isSelected && (
        <path
          d={path.body}
          fill="none"
          stroke="#0D7A7A"
          strokeWidth="4"
          strokeLinejoin="round"
          opacity="0.7"
        />
      )}

      {/* Main tooth body with 3D gradient */}
      <path
        d={path.body}
        fill={`url(#${gradId})`}
        stroke="#9A8E82"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Enamel highlight spot */}
      <path
        d={path.body}
        fill={`url(#${highlightId})`}
        pointerEvents="none"
      />

      {/* Condition overlay */}
      {condition !== "HEALTHY" && renderConditionOverlay()}

      {/* Selected teal tint */}
      {isSelected && (
        <path
          d={path.body}
          fill="rgba(13, 122, 122, 0.12)"
          pointerEvents="none"
        />
      )}

      {/* Anatomical detail lines */}
      {path.details.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#7A6E62"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.35"
          pointerEvents="none"
        />
      ))}
      {/* Arrow if treated elsewhere */}
      {treatedElsewhere && (
        tooth.row === "upper" ? (
          <g stroke="#000000" fill="#000000" pointerEvents="none">
            <line x1="0" y1="-30" x2="0" y2="-6" strokeWidth="3.5" strokeLinecap="round" />
            <polygon points="-6,-14 0,-4 6,-14" />
          </g>
        ) : (
          <g stroke="#000000" fill="#000000" pointerEvents="none">
            <line x1="0" y1={path.h + 30} x2="0" y2={path.h + 6} strokeWidth="3.5" strokeLinecap="round" />
            <polygon points={`-6,${path.h + 14} 0,${path.h + 4} 6,${path.h + 14}`} />
          </g>
        )
      )}
    </g>
  );
}
