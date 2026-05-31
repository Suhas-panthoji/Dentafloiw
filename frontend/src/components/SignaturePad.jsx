import React, { useRef, useEffect, useState } from "react";

export default function SignaturePad({ value, onChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(!!value);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.src = value;
      setHasInk(true);
    }
  }, []); // eslint-disable-line

  const pos = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: ((t.clientX - r.left) / r.width) * c.width, y: ((t.clientY - r.top) / r.height) * c.height };
  };
  const start = (e) => { setDrawing(true); const p = pos(e); const ctx = canvasRef.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const move = (e) => { if (!drawing) return; e.preventDefault(); const p = pos(e); const ctx = canvasRef.current.getContext("2d"); ctx.lineTo(p.x, p.y); ctx.strokeStyle = "#0A6E6E"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke(); setHasInk(true); };
  const end = () => setDrawing(false);

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    setHasInk(false);
    onChange?.(null);
  };
  const capture = () => {
    if (!hasInk) return;
    const data = canvasRef.current.toDataURL("image/png");
    onChange?.(data);
  };

  return (
    <div className="space-y-2" data-testid="signature-pad">
      <canvas ref={canvasRef} width={500} height={160}
        className="border border-[var(--border)] rounded-md w-full bg-white touch-none"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
      <div className="flex gap-2 items-center flex-wrap">
        <button type="button" className="df-btn df-btn-ghost" onClick={clear}>Clear</button>
        <button type="button" className="df-btn" onClick={capture} data-testid="capture-signature">Capture Signature</button>
        {value && <span className="text-sm text-[var(--success)]">✓ Signature saved</span>}
      </div>
    </div>
  );
}
