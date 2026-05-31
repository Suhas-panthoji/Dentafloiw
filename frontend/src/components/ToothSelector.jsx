import React, { useMemo } from "react";
import { FDI_PERMANENT } from "@/lib/format";

/* Compact tooth picker. value/onChange = comma-separated tooth numbers. */
export default function ToothSelector({ value = "", onChange }) {
  const selected = useMemo(
    () => new Set(value.split(",").map((s) => s.trim()).filter(Boolean)),
    [value]
  );

  const toggle = (n) => {
    const s = new Set(selected);
    const k = String(n);
    if (s.has(k)) s.delete(k); else s.add(k);
    onChange?.(Array.from(s).sort((a, b) => +a - +b).join(", "));
  };

  const clear = () => onChange?.("");

  const renderQ = (arr, align) => (
    <div className={`flex gap-1 ${align === "left" ? "justify-start" : "justify-end"}`}>
      {arr.map((n) => {
        const on = selected.has(String(n));
        return (
          <button type="button" key={n} onClick={() => toggle(n)}
            className={`w-8 h-8 text-[11px] text-black font-semibold rounded border transition-all ${on ? "bg-[var(--teal)] border-[var(--teal)]" : "bg-white border-[var(--border)] hover:border-[var(--teal)]"}`}
            data-testid={`tooth-${n}`}>
            {n}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <div className="df-label mb-1">Upper Right</div>
          {renderQ(FDI_PERMANENT.upperRight, "right")}
        </div>
        <div>
          <div className="df-label mb-1">Upper Left</div>
          {renderQ(FDI_PERMANENT.upperLeft, "left")}
        </div>
        <div>
          <div className="df-label mb-1">Lower Right</div>
          {renderQ(FDI_PERMANENT.lowerRight, "right")}
        </div>
        <div>
          <div className="df-label mb-1">Lower Left</div>
          {renderQ(FDI_PERMANENT.lowerLeft, "left")}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <input className="df-input flex-1" placeholder="Tooth numbers e.g. 11, 21, 36"
               value={value} onChange={(e) => onChange?.(e.target.value)} data-testid="treated-teeth-input"/>
        <button type="button" className="df-btn df-btn-ghost" onClick={clear}>Clear</button>
      </div>
    </div>
  );
}
