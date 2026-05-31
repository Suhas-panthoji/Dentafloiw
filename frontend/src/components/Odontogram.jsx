import React, { useState } from "react";
import { CONDITION_COLOR, FDI_PERMANENT, FDI_DECIDUOUS, TOOTH_CONDITIONS } from "@/lib/format";

const selectedStyle = (isSelected) => ({
  stroke: isSelected ? "#2563EB" : undefined,
  strokeWidth: isSelected ? 2.5 : undefined,
});

function toothKind(num) {
  const last = String(num).slice(-1);
  if (["6", "7", "8", "4", "5"].includes(last)) return "molar";
  if (last === "3") return "canine";
  return "incisor";
}

function CrownShape({ kind, y, flipped, fill, dark, onClick, selected }) {
  const crownFill = dark ? "#3F3F3F" : fill;
  if (kind === "molar") {
    return (
      <path className="tooth-outline tooth-click"
        d={`M18 ${y + 50} C13 ${y + 36} 15 ${y + 13} 23 ${y + 9} C27 ${y + 15} 29 ${y + 26} 34 ${y + 28} C35 ${y + 16} 41 ${y + 8} 47 ${y + 10} C55 ${y + 20} 55 ${y + 40} 50 ${y + 52} C40 ${y + 56} 28 ${y + 56} 18 ${y + 50} Z`}
        fill={crownFill} transform={flipped ? `rotate(180 36 ${y + 36})` : undefined}
        onClick={onClick} style={selectedStyle(selected)}/>
    );
  }
  if (kind === "canine") {
    return (
      <path className="tooth-outline tooth-click"
        d={`M23 ${y + 52} C22 ${y + 36} 27 ${y + 15} 36 ${y + 5} C45 ${y + 15} 50 ${y + 36} 49 ${y + 52} C41 ${y + 56} 31 ${y + 56} 23 ${y + 52} Z`}
        fill={crownFill} transform={flipped ? `rotate(180 36 ${y + 36})` : undefined}
        onClick={onClick} style={selectedStyle(selected)}/>
    );
  }
  return (
    <path className="tooth-outline tooth-click"
      d={`M24 ${y + 52} C22 ${y + 38} 25 ${y + 16} 36 ${y + 8} C47 ${y + 16} 50 ${y + 38} 48 ${y + 52} C41 ${y + 56} 31 ${y + 56} 24 ${y + 52} Z`}
      fill={crownFill} transform={flipped ? `rotate(180 36 ${y + 36})` : undefined}
      onClick={onClick} style={selectedStyle(selected)}/>
  );
}

function RootShape({ kind, y, flipped, dark }) {
  const fill = dark ? "#4A4A4A" : "#D9C889";
  if (kind === "molar") {
    return (
      <path className="tooth-root"
        d={`M20 ${y + 50} C18 ${y + 30} 17 ${y + 12} 22 ${y + 2} C30 ${y + 10} 32 ${y + 26} 36 ${y + 31} C39 ${y + 23} 42 ${y + 9} 50 ${y + 3} C56 ${y + 18} 53 ${y + 36} 50 ${y + 50} C41 ${y + 54} 29 ${y + 54} 20 ${y + 50} Z`}
        fill={fill} transform={flipped ? `rotate(180 36 ${y + 28})` : undefined}/>
    );
  }
  if (kind === "canine") {
    return (
      <path className="tooth-root"
        d={`M28 ${y + 50} C29 ${y + 29} 31 ${y + 11} 36 ${y + 1} C43 ${y + 15} 45 ${y + 33} 44 ${y + 50} C39 ${y + 53} 33 ${y + 53} 28 ${y + 50} Z`}
        fill={fill} transform={flipped ? `rotate(180 36 ${y + 28})` : undefined}/>
    );
  }
  return (
    <path className="tooth-root"
      d={`M29 ${y + 50} C29 ${y + 30} 31 ${y + 12} 36 ${y + 2} C42 ${y + 13} 44 ${y + 31} 43 ${y + 50} C39 ${y + 53} 33 ${y + 53} 29 ${y + 50} Z`}
      fill={fill} transform={flipped ? `rotate(180 36 ${y + 28})` : undefined}/>
  );
}

function SurfaceRing({ surfaces, selected, onClick, y }) {
  const colorOf = (s) => CONDITION_COLOR[surfaces?.[s]] || "#FFFFFF";
  const sel = (s) => selected?.includes(s);
  return (
    <g>
      <circle cx="36" cy={y + 18} r="17" fill="#FAFAFA" stroke="#A6A39B" strokeWidth="1.6"/>
      <path className="tooth-surface" d={`M21 ${y + 8} A17 17 0 0 1 51 ${y + 8} L43 ${y + 16} A8 8 0 0 0 29 ${y + 16} Z`}
        fill={colorOf("buccal")} onClick={() => onClick("buccal")} style={selectedStyle(sel("buccal"))}/>
      <path className="tooth-surface" d={`M51 ${y + 8} A17 17 0 0 1 51 ${y + 28} L43 ${y + 20} A8 8 0 0 0 43 ${y + 16} Z`}
        fill={colorOf("distal")} onClick={() => onClick("distal")} style={selectedStyle(sel("distal"))}/>
      <path className="tooth-surface" d={`M51 ${y + 28} A17 17 0 0 1 21 ${y + 28} L29 ${y + 20} A8 8 0 0 0 43 ${y + 20} Z`}
        fill={colorOf("lingual")} onClick={() => onClick("lingual")} style={selectedStyle(sel("lingual"))}/>
      <path className="tooth-surface" d={`M21 ${y + 28} A17 17 0 0 1 21 ${y + 8} L29 ${y + 16} A8 8 0 0 0 29 ${y + 20} Z`}
        fill={colorOf("mesial")} onClick={() => onClick("mesial")} style={selectedStyle(sel("mesial"))}/>
      <circle className="tooth-surface" cx="36" cy={y + 18} r="8"
        fill={colorOf("occlusal")} onClick={() => onClick("occlusal")} style={selectedStyle(sel("occlusal"))}/>
      {surfaces?.occlusal === "missing" && (
        <>
          <line x1="22" y1={y + 4} x2="50" y2={y + 32} stroke="#4B5563" strokeWidth="2"/>
          <line x1="50" y1={y + 4} x2="22" y2={y + 32} stroke="#4B5563" strokeWidth="2"/>
        </>
      )}
    </g>
  );
}

/* Renders one tooth with anatomical crowns plus 5 clickable surfaces (O M D B L). */
function ToothSVG({ num, surfaces, onClick, selected, arch }) {
  const kind = toothKind(num);
  const missing = surfaces?.occlusal === "missing";
  const buccal = CONDITION_COLOR[surfaces?.buccal] || "#FFFFFF";
  const lingual = CONDITION_COLOR[surfaces?.lingual] || "#FFFFFF";
  const upper = arch === "upper";

  return (
    <svg className="odont-tooth-svg" width="72" height="166" viewBox="0 0 72 166" aria-label={`Tooth ${num}`}>
      {upper && <text className="odont-label" x="36" y="15" textAnchor="middle">{num}</text>}
      {upper ? (
        <>
          <RootShape kind={kind} y={20} dark={missing}/>
          <CrownShape kind={kind} y={51} fill={buccal} dark={missing} selected={selected?.includes("buccal")} onClick={() => onClick("buccal")}/>
          <SurfaceRing surfaces={surfaces} selected={selected} onClick={onClick} y={91}/>
          <CrownShape kind={kind} y={116} flipped fill={lingual} dark={missing} selected={selected?.includes("lingual")} onClick={() => onClick("lingual")}/>
        </>
      ) : (
        <>
          <CrownShape kind={kind} y={15} fill={buccal} dark={missing} selected={selected?.includes("buccal")} onClick={() => onClick("buccal")}/>
          <SurfaceRing surfaces={surfaces} selected={selected} onClick={onClick} y={58}/>
          <CrownShape kind={kind} y={82} flipped fill={lingual} dark={missing} selected={selected?.includes("lingual")} onClick={() => onClick("lingual")}/>
          <RootShape kind={kind} y={100} flipped dark={missing}/>
          <text className="odont-label" x="36" y="162" textAnchor="middle">{num}</text>
        </>
      )}
    </svg>
  );
}

function ToothTooltip({ surfaces }) {
  const entries = Object.entries(surfaces || {}).filter(([, v]) => v && v !== "healthy");
  if (entries.length === 0) return null;
  return (
    <div className="absolute z-30 bg-white text-slate-900 border border-slate-200 rounded-md shadow-md p-2 text-[11px] -mt-2">
      {entries.map(([k, v]) => <div key={k}><b className="capitalize">{k}</b>: {v}</div>)}
    </div>
  );
}

export default function Odontogram({ value, onChange, readOnly = false }) {
  const [dentition, setDentition] = useState("permanent");
  const [selected, setSelected] = useState({}); // toothNum -> [surface]
  const [condition, setCondition] = useState("cavity");
  const [hover, setHover] = useState(null);

  const teeth = value?.teeth || {};
  const set = FDI_PERMANENT;
  const dec = FDI_DECIDUOUS;
  const useDec = dentition === "deciduous";
  const layout = useDec ? dec : set;

  const toggleSurface = (num, surface) => {
    if (readOnly) return;
    setSelected((prev) => {
      const cur = new Set(prev[num] || []);
      if (cur.has(surface)) cur.delete(surface); else cur.add(surface);
      return { ...prev, [num]: Array.from(cur) };
    });
  };

  const apply = () => {
    const newTeeth = { ...(value?.teeth || {}) };
    for (const [num, surfaces] of Object.entries(selected)) {
      const cur = { ...(newTeeth[num] || {}) };
      surfaces.forEach((s) => { cur[s] = condition; });
      newTeeth[num] = cur;
    }
    const history = [...(value?.history || []), {
      date: new Date().toISOString(),
      condition,
      changes: selected,
    }];
    onChange?.({ teeth: newTeeth, history });
    setSelected({});
  };

  const clearAll = () => setSelected({});

  const renderRow = (left, right, arch) => (
    <div className="odont-row">
      {[...left, ...right].map((n, idx) => (
        <div key={n} className="odont-tooth-cell" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}>
          <ToothSVG num={n} arch={arch} surfaces={teeth[n]} selected={selected[n]} onClick={(s) => toggleSurface(n, s)}/>
          {hover === n && <ToothTooltip surfaces={teeth[n]}/>}
          {idx === left.length - 1 && <div className="odont-midline"/>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4" data-testid="odontogram">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="df-label">Dentition:</div>
        {[["permanent","Permanent"],["deciduous","Deciduous"],["mixed","Mixed"]].map(([k,l]) => (
          <button key={k} onClick={() => setDentition(k)} className={`df-chip ${dentition === k ? "active" : ""}`}
            data-testid={`dentition-${k}`}>{l}</button>
        ))}
      </div>

      <div className="df-card odont-card">
        <div className="odont-arch-labels">
          <div>Upper Right</div>
          <div>Upper Left</div>
        </div>
        <div className="odont-scroll">
          {renderRow(layout.upperRight, layout.upperLeft, "upper")}
          <div className="odont-bite-line"/>
          {renderRow(layout.lowerRight, layout.lowerLeft, "lower")}
        </div>
        <div className="odont-arch-labels">
          <div>Lower Right</div>
          <div>Lower Left</div>
        </div>
      </div>

      {!readOnly && (
        <div className="df-card p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="df-label">Condition:</div>
            <select className="df-input max-w-[220px]" value={condition} onChange={(e) => setCondition(e.target.value)} data-testid="condition-select">
              {TOOTH_CONDITIONS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <button className="df-btn" onClick={apply} disabled={Object.keys(selected).length === 0} data-testid="apply-condition">Apply</button>
            <button className="df-btn df-btn-ghost" onClick={clearAll}>Clear Selection</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {TOOTH_CONDITIONS.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--text-2)]">
                <span className="w-3 h-3 rounded-sm border border-[var(--border)]" style={{ background: c.color }}/>
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
