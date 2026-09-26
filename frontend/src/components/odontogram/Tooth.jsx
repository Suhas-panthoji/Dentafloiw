import React from "react";
import { surfaceSpot } from "./toothShapes";
import { SURFACE_CONDITIONS, conditionLabel, surfaceLabel } from "./toothConfig";

const OUTLINE = "#5B4E42";

/**
 * One tooth on the chart, drawn with shaded enamel (crown) and dentin (root).
 *
 * Props:
 *   tooth       – layout entry from buildArchLayout (number, shape, x, yOcc, scale, mirror, …)
 *   uid         – id prefix of the chart's shared gradients
 *   condition   – "HEALTHY" | "CAVITY" | …
 *   surfaces    – ["occlusal", "mesial", …] for surface conditions
 *   isSelected  – popup is open for this tooth
 *   treatedThisVisit – teal glow
 *   treatedElsewhere – arrow pointing at the tooth
 *   onClick / onContextMenu – (toothNumber, event) => void
 */
export default function Tooth({
  tooth,
  uid,
  condition = "HEALTHY",
  surfaces = [],
  isSelected,
  treatedThisVisit,
  treatedElsewhere = false,
  onClick,
  onContextMenu,
}) {
  const { shape, number } = tooth;
  const { W, H, R } = shape;
  const upper = tooth.row === "upper";
  const isMissing = condition === "MISSING";
  const clipId = `${uid}-crown-${number}`;
  const surfaceText = surfaces.length
    ? ` (${surfaces.map((s) => surfaceLabel(s, number).full).join(", ")})`
    : "";
  const label = `Tooth ${number} – ${conditionLabel(condition)}${surfaceText}`;

  const s = tooth.scale;
  const transform = `translate(${tooth.x} ${tooth.yOcc}) scale(${(tooth.mirror ? -1 : 1) * s} ${(upper ? -1 : 1) * s})`;

  const handleClick = (e) => {
    e.stopPropagation();
    onClick?.(number, e);
  };

  const handleContext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu?.(number, e);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(number, e);
    }
  };

  const crownFill =
    condition === "CROWN" ? `url(#${uid}-gold)`
      : condition === "BRIDGE" ? `url(#${uid}-silver)`
      : `url(#${uid}-enamel)`;

  const renderSurfaceMarks = () => {
    if (!SURFACE_CONDITIONS.has(condition) || condition === "FRACTURED") return null;
    const isCavity = condition === "CAVITY";
    if (surfaces.length === 0) {
      // No surface given: tint the whole crown.
      return (
        <path d={shape.crown} fill={isCavity ? "#6B2F12" : "#2563EB"} opacity="0.28" />
      );
    }
    return surfaces.map((key) => {
      const spot = surfaceSpot(shape, key, tooth.anterior);
      if (!spot) return null;
      const behind = key === "lingual";
      return (
        <ellipse
          key={key}
          {...spot}
          fill={isCavity ? `url(#${uid}-decay)` : `url(#${uid}-filling)`}
          stroke={isCavity ? "#3B1A08" : "#1E3A8A"}
          strokeWidth="1"
          strokeDasharray={behind ? "3 2" : undefined}
          opacity={behind ? 0.55 : 0.95}
          vectorEffect="non-scaling-stroke"
        />
      );
    });
  };

  const renderFracture = () => {
    if (condition !== "FRACTURED") return null;
    const x0 = surfaces.includes("mesial") ? W * 0.28 : surfaces.includes("distal") ? -W * 0.28 : 0;
    const crack = [
      [x0, 0],
      [x0 + W * 0.07, H * 0.18],
      [x0 - W * 0.05, H * 0.36],
      [x0 + W * 0.05, H * 0.54],
      [x0 - W * 0.02, H * 0.72],
    ].map(([x, y]) => `${x},${y}`).join(" ");
    return (
      <>
        <path d={shape.crown} fill="#F97316" opacity="0.18" />
        <polyline points={crack} fill="none" stroke="#9A3412" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </>
    );
  };

  const renderImplant = () => {
    const top = H + 0.9;
    const bottom = H + R * 0.88;
    const wTop = shape.Wc * 0.25;
    const wBottom = shape.Wc * 0.15;
    const threads = [];
    for (let y = top + 0.9; y < bottom - 0.6; y += 1.1) {
      const t = (y - top) / (bottom - top);
      const hw = wTop + (wBottom - wTop) * t;
      threads.push(<line key={y} x1={-hw} y1={y + 0.25} x2={hw} y2={y - 0.25}
        stroke="#1F2937" strokeWidth="1" opacity="0.7" vectorEffect="non-scaling-stroke" />);
    }
    return (
      <g>
        <rect x={-shape.Wc * 0.16} y={H - 0.2} width={shape.Wc * 0.32} height={1.3}
          fill="#9CA3AF" stroke="#1F2937" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        <path
          d={`M${-wTop} ${top} L${wTop} ${top} L${wBottom} ${bottom - 0.8} Q0 ${bottom + 0.4} ${-wBottom} ${bottom - 0.8} Z`}
          fill={`url(#${uid}-titanium)`} stroke="#1F2937" strokeWidth="1.2" vectorEffect="non-scaling-stroke"
        />
        {threads}
      </g>
    );
  };

  const renderRootCanal = () => {
    if (condition !== "RCT") return null;
    const c = shape.chamber;
    return (
      <>
        <path d={shape.root} fill="#7E22CE" opacity="0.1" />
        {shape.canals.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#7E22CE" strokeWidth="3"
            strokeLinecap="round" opacity="0.9" vectorEffect="non-scaling-stroke" />
        ))}
        <ellipse cx={c.cx} cy={c.cy} rx={c.rx} ry={c.ry} fill="#7E22CE" opacity="0.85" />
      </>
    );
  };

  const renderArrow = () => {
    if (!treatedElsewhere) return null;
    const { tail, head } = tooth.arrow;
    const dir = head > tail ? 1 : -1;
    return (
      <g pointerEvents="none" data-testid={`treated-elsewhere-${number}`}>
        <line x1={tooth.x} y1={tail} x2={tooth.x} y2={head - dir * 5}
          stroke="#111827" strokeWidth="2.5" strokeLinecap="round" />
        <polygon
          points={`${tooth.x - 5},${head - dir * 7} ${tooth.x},${head} ${tooth.x + 5},${head - dir * 7}`}
          fill="#111827"
        />
      </g>
    );
  };

  const halo = (isSelected || treatedThisVisit) && (
    <g fill="none" stroke={isSelected ? "#0D9488" : "#14B8A6"} strokeWidth={isSelected ? 5 : 6}
      strokeLinejoin="round" opacity={isSelected ? 0.8 : 0.55}
      className={treatedThisVisit && !isSelected ? "odont-glow-pulse" : undefined}>
      {condition !== "IMPLANT" && <path d={shape.root} vectorEffect="non-scaling-stroke" />}
      <path d={shape.crown} vectorEffect="non-scaling-stroke" />
    </g>
  );

  return (
    <g
      id={`tooth${number}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      data-testid={`tooth-${number}`}
      data-condition={condition}
      onClick={handleClick}
      onContextMenu={handleContext}
      onKeyDown={handleKeyDown}
      className="odont-tooth"
    >
      <title>{label}</title>
      <g transform={transform}>
        <defs>
          <clipPath id={clipId}>
            <path d={shape.crown} />
          </clipPath>
        </defs>

        {halo}

        {isMissing ? (
          <g>
            <g fill="rgba(120,110,100,0.06)" stroke="#A39584" strokeWidth="1.2" strokeDasharray="4 3">
              <path d={shape.root} vectorEffect="non-scaling-stroke" />
              <path d={shape.crown} vectorEffect="non-scaling-stroke" />
            </g>
            <g stroke="#3F3F46" strokeWidth="3" strokeLinecap="round" opacity="0.85">
              <line x1={-W * 0.5} y1={-0.4} x2={W * 0.5} y2={H + R * 0.9} vectorEffect="non-scaling-stroke" />
              <line x1={W * 0.5} y1={-0.4} x2={-W * 0.5} y2={H + R * 0.9} vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        ) : (
          <g>
            {/* Root (replaced by a screw for implants) */}
            {condition === "IMPLANT" ? renderImplant() : (
              <>
                {shape.hiddenRoot && (
                  <path d={shape.hiddenRoot} fill={`url(#${uid}-root-back)`}
                    stroke={OUTLINE} strokeWidth="1" opacity="0.9" vectorEffect="non-scaling-stroke" />
                )}
                <path d={shape.root} fill={`url(#${uid}-dentin)`} />
                <path d={shape.root} fill={`url(#${uid}-root-shade)`} />
              </>
            )}

            {/* Crown */}
            <path d={shape.crown} fill={crownFill} />
            <path d={shape.crown} fill={`url(#${uid}-cervical-shade)`} />
            <g clipPath={`url(#${clipId})`}>
              <ellipse cx={W * 0.06} cy={H * 0.34} rx={W * 0.2} ry={H * 0.26}
                fill={`url(#${uid}-gloss)`} />
              {renderSurfaceMarks()}
            </g>

            {renderFracture()}
            {renderRootCanal()}

            {/* Anatomical grooves */}
            {shape.details.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#8C7B69" strokeWidth="1"
                strokeLinecap="round" opacity="0.6" vectorEffect="non-scaling-stroke" />
            ))}

            {/* Outline on top of every fill */}
            <g fill="none" stroke={condition === "CROWN" ? "#7A5A14" : OUTLINE}
              strokeWidth="1.3" strokeLinejoin="round">
              {condition !== "IMPLANT" && <path d={shape.root} stroke={OUTLINE} vectorEffect="non-scaling-stroke" />}
              <path d={shape.crown} vectorEffect="non-scaling-stroke" />
            </g>
          </g>
        )}
      </g>
      {renderArrow()}
    </g>
  );
}
