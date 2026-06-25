import React, { useState } from "react";
import { FDI_PERMANENT, FDI_DECIDUOUS, TOOTH_CONDITIONS } from "@/lib/format";

const CONDITION_STYLES = {
  healthy: {
    bg: "bg-gradient-to-b from-[#FDFBF7] to-[#EAE5DA]",
    text: "text-slate-700",
    border: "border-gray-200"
  },
  missing: {
    bg: "bg-[#A3A3A3]/60",
    text: "text-[#525252] font-black",
    border: "border-neutral-400"
  },
  cavity: {
    bg: "bg-[#EB5757]/10",
    text: "text-[#EB5757]",
    border: "border-2 border-[#EB5757] animate-pulse"
  },
  planned: {
    bg: "bg-[#EB5757]/20",
    text: "text-[#EB5757]",
    border: "border-dashed border-[#EB5757]"
  },
  "root-canal": {
    bg: "bg-gradient-to-b from-[#E2B3A3] to-[#C88A75]",
    text: "text-[#7D4F41]",
    border: "border-[#C88A75]"
  },
  filling: {
    bg: "bg-[#2D9CDB]",
    text: "text-white",
    border: "border-[#1B74A5]"
  },
  crown: {
    bg: "bg-[#2F80ED]",
    text: "text-white",
    border: "border-[#1258B3]"
  },
  veneer: {
    bg: "bg-white border-l-4 border-[#56CCF2]",
    text: "text-slate-700",
    border: "border-gray-200"
  },
  implant: {
    bg: "bg-gradient-to-b from-[#EAE5DA] to-[#4F4F4F]",
    text: "text-white",
    border: "border-neutral-700"
  }
};

function toothKind(num) {
  const last = String(num).slice(-1);
  if (["6", "7", "8", "4", "5"].includes(last)) return "molar";
  if (last === "3") return "canine";
  return "incisor";
}

function ToothSilhouette({ kind, className }) {
  if (kind === "molar") {
    return (
      <svg className={className} viewBox="0 0 40 40" fill="currentColor">
        <path d="M6,8 C6,5 12,5 14,8 C16,5 24,5 26,8 C28,5 34,5 34,8 C36,12 36,22 34,26 C32,30 26,38 25,38 C23,38 21,30 20,30 C19,30 17,38 15,38 C14,38 8,30 6,26 C4,22 4,12 6,8 Z" />
      </svg>
    );
  }
  if (kind === "canine") {
    return (
      <svg className={className} viewBox="0 0 40 40" fill="currentColor">
        <path d="M10,10 C10,5 20,2 20,2 C20,2 30,5 30,10 C30,15 28,25 26,30 C24,35 22,39 20,39 C18,39 16,35 14,30 C12,25 10,15 10,10 Z" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 40 40" fill="currentColor">
      <path d="M11,6 C11,6 29,6 29,6 C31,12 30,22 27,28 C24,34 22,39 20,39 C18,39 16,34 13,28 C10,22 9,12 11,6 Z" />
    </svg>
  );
}

function getToothCondition(toothVal) {
  if (!toothVal) return "healthy";
  if (typeof toothVal === "string") return toothVal;
  if (typeof toothVal === "object") {
    if (toothVal.condition) return toothVal.condition;
    const values = Object.values(toothVal);
    const nonHealthy = values.find((v) => v && v !== "healthy");
    if (nonHealthy) {
      return nonHealthy === "rct" ? "root-canal" : nonHealthy;
    }
  }
  return "healthy";
}

function ToothCard({ num, condition, isSelected, onClick }) {
  const kind = toothKind(num);
  const style = CONDITION_STYLES[condition] || CONDITION_STYLES.healthy;
  const isMissing = condition === "missing";
  const isHealthy = condition === "healthy";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-[60px] h-[96px] flex flex-col items-center justify-between p-2 rounded-lg border transition-all ${style.bg} ${style.border} ${style.text} ${
        isSelected
          ? "ring-2 ring-blue-500 ring-offset-2 scale-[1.03] shadow-md z-10"
          : "hover:scale-[1.02] hover:shadow-sm"
      }`}
      title={`Tooth ${num} - ${condition}`}
      data-testid={`tooth-${num}`}
    >
      <span className="text-[12px] font-bold tracking-tight">{num}</span>
      {isMissing ? (
        <div className="text-[20px] font-black text-[#525252] select-none h-8 flex items-center justify-center">X</div>
      ) : (
        <ToothSilhouette kind={kind} className="w-7 h-7 opacity-85" />
      )}
      <span className="text-[8px] font-semibold leading-none capitalize truncate max-w-full">
        {isHealthy ? "Healthy" : condition.replace("-", " ")}
      </span>
    </button>
  );
}

export default function Odontogram({ value, onChange, readOnly = false }) {
  const [dentition, setDentition] = useState("permanent");
  const [selected, setSelected] = useState([]); // Array of tooth numbers
  const [condition, setCondition] = useState("cavity");

  const teeth = value?.teeth || {};
  const layout = dentition === "deciduous" ? FDI_DECIDUOUS : FDI_PERMANENT;

  const toggleTooth = (num) => {
    if (readOnly) return;
    setSelected((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const apply = () => {
    const newTeeth = { ...(value?.teeth || {}) };
    selected.forEach((num) => {
      newTeeth[num] = condition;
    });
    const history = [
      ...(value?.history || []),
      {
        date: new Date().toISOString(),
        condition,
        changes: selected.reduce((acc, num) => ({ ...acc, [num]: [condition] }), {}),
      },
    ];
    onChange?.({ teeth: newTeeth, history });
    setSelected([]);
  };

  const clearAll = () => setSelected([]);

  const renderRow = (left, right) => (
    <div className="flex items-center gap-1.5 justify-center">
      {left.map((n) => (
        <ToothCard
          key={n}
          num={n}
          condition={getToothCondition(teeth[n])}
          isSelected={selected.includes(n)}
          onClick={() => toggleTooth(n)}
        />
      ))}
      <div className="w-[2px] h-[96px] bg-slate-300 mx-2 self-stretch opacity-60" />
      {right.map((n) => (
        <ToothCard
          key={n}
          num={n}
          condition={getToothCondition(teeth[n])}
          isSelected={selected.includes(n)}
          onClick={() => toggleTooth(n)}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4" data-testid="odontogram">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="df-label">Dentition:</div>
        {[["permanent", "Permanent"], ["deciduous", "Deciduous"]].map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setDentition(k);
              setSelected([]);
            }}
            className={`df-chip ${dentition === k ? "active" : ""}`}
            data-testid={`dentition-${k}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="df-card odont-card p-4">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium px-4 mb-2 select-none">
          <div>Upper Right (UR)</div>
          <div className="font-bold text-slate-400">UPPER</div>
          <div>Upper Left (UL)</div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="text-lg font-black text-slate-300 select-none">R</div>
          <div className="flex flex-col gap-6 overflow-x-auto py-2">
            {renderRow(layout.upperRight, layout.upperLeft)}
            <div className="h-[1px] bg-dashed bg-slate-200 relative my-1">
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400 font-bold bg-[var(--card-bg)] px-2 mx-auto w-fit select-none">BITE LINE</span>
            </div>
            {renderRow(layout.lowerRight, layout.lowerLeft)}
          </div>
          <div className="text-lg font-black text-slate-300 select-none">L</div>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] font-medium px-4 mt-2 select-none">
          <div>Lower Right (LR)</div>
          <div className="font-bold text-slate-400">LOWER</div>
          <div>Lower Left (LL)</div>
        </div>
      </div>

      {!readOnly && (
        <div className="df-card p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="df-label">Condition:</div>
            <select
              className="df-input max-w-[220px]"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              data-testid="condition-select"
            >
              {TOOTH_CONDITIONS.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="df-btn"
              onClick={apply}
              disabled={selected.length === 0}
              data-testid="apply-condition"
            >
              Apply to Selected ({selected.length})
            </button>
            <button
              type="button"
              className="df-btn df-btn-ghost"
              onClick={clearAll}
              disabled={selected.length === 0}
            >
              Clear Selection
            </button>
          </div>
          <div className="flex flex-wrap gap-3 pt-1 border-t border-[var(--border)]">
            {TOOTH_CONDITIONS.map((c) => {
              const style = CONDITION_STYLES[c.key] || CONDITION_STYLES.healthy;
              return (
                <span
                  key={c.key}
                  className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded border ${style.bg} ${style.border} ${style.text}`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                  {c.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
