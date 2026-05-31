import React, { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, Tags } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";
import { inr } from "@/lib/format";

const CATS = ["Diagnostic","Restorative","Surgical","Orthodontic","Cosmetic"];

export default function PriceCatalogPage() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const blank = { name: "", fee: 0, lab_cost: 0, category: "Restorative" };
  const [form, setForm] = useState(blank);

  const load = () => api.get("/treatments").then((r) => setItems(r.data)).catch((e) => toast.error(formatErr(e)));
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return toast.error("Name required");
    try {
      if (editing) await api.put(`/treatments/${editing}`, form);
      else await api.post("/treatments", form);
      toast.success("Saved"); setForm(blank); setEditing(null); load();
    } catch (e) { toast.error(formatErr(e)); }
  };
  const onEdit = (t) => { setEditing(t.id); setForm({ name: t.name, fee: t.fee, lab_cost: t.lab_cost, category: t.category }); };
  const onDel = async (id) => { try { await api.delete(`/treatments/${id}`); load(); } catch (e) { toast.error(formatErr(e)); } };

  return (
    <div className="space-y-5 df-anim-in" data-testid="catalog-page">
      <div>
        <h1>Price Catalog</h1>
        <p className="text-[var(--text-2)] mt-1">Standard treatment fees auto-fill into new visits.</p>
      </div>

      <div className="df-card p-5 grid md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-4"><label className="df-label">Treatment Name</label>
          <input className="df-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="cat-name"/></div>
        <div className="md:col-span-2"><label className="df-label">Fee (₹)</label>
          <input type="number" className="df-input" value={form.fee} onChange={(e) => setForm({ ...form, fee: +e.target.value })}/></div>
        <div className="md:col-span-2"><label className="df-label">Lab Cost (₹)</label>
          <input type="number" className="df-input" value={form.lab_cost} onChange={(e) => setForm({ ...form, lab_cost: +e.target.value })}/></div>
        <div className="md:col-span-2"><label className="df-label">Category</label>
          <select className="df-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
        <button className="df-btn md:col-span-2" onClick={save} data-testid="cat-save">
          <Plus size={14}/> {editing ? "Update" : "Add"}
        </button>
      </div>

      <div className="df-card df-table-scroll">
        {items.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-2)]">
            <Tags size={28} className="mx-auto mb-2 text-[var(--teal)]"/>No treatments yet
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[var(--text-2)] text-[12px] uppercase tracking-wider border-b border-[var(--border)]">
              <th className="py-3 px-4">Name</th><th>Category</th><th>Fee</th><th>Lab Cost</th><th></th>
            </tr></thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)]">
                  <td className="py-3 px-4 font-medium">{t.name}</td>
                  <td><span className="df-badge df-badge-teal">{t.category}</span></td>
                  <td>{inr(t.fee)}</td>
                  <td>{inr(t.lab_cost)}</td>
                  <td className="text-right pr-3">
                    <button className="df-btn df-btn-ghost py-1 px-2 text-[13px]" onClick={() => onEdit(t)}><Edit3 size={12}/></button>
                    <button className="df-btn df-btn-ghost py-1 px-2 text-[13px] text-[var(--danger)]" onClick={() => onDel(t.id)}><Trash2 size={12}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
