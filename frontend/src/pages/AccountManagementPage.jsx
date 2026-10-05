import React, { useEffect, useState } from "react";
import { Clock3, KeyRound, Pencil, Plus, RefreshCw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";

const blankAccount = { name: "", email: "", role: "staff", password: "" };

export default function AccountManagementPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blankAccount);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadUsers = () => api.get("/admin/users")
    .then((response) => setUsers(Array.isArray(response.data) ? response.data : response.data?.users || []))
    .catch((err) => { setUsers([]); toast.error(formatErr(err) || "Could not load accounts."); });

  useEffect(() => { loadUsers(); }, []);

  const updateForm = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const closeModal = () => { setEditing(null); setForm(blankAccount); setHistory([]); };
  const beginCreate = () => { setEditing({ isNew: true }); setForm(blankAccount); setHistory([]); };
  const beginEdit = (account) => {
    setEditing(account);
    setForm({ name: account.name, email: account.email, role: account.role, password: "" });
    setHistoryLoading(true);
    api.get(`/admin/users/${account.id}/password-history`)
      .then((response) => setHistory(Array.isArray(response.data) ? response.data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (editing?.isNew && form.password.length < 8) return toast.error("Use a password with at least 8 characters.");
    const payload = { ...form };
    if (!editing?.isNew && !payload.password) delete payload.password;
    setSaving(true);
    try {
      if (editing?.isNew) await api.post("/admin/users", payload);
      else await api.put(`/admin/users/${editing.id}`, payload);
      toast.success(editing?.isNew ? "Account created." : "Account updated. Active sessions were revoked if its role or password changed.");
      closeModal();
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not save the account.");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 df-anim-in" data-testid="accounts-page">
      <div><h1>Account Management</h1><p className="text-[var(--text-2)] mt-1">Create and manage clinic login accounts. Passwords are stored securely and cannot be viewed.</p></div>

      <div className="df-card overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-[var(--teal)]"/><h3>All Login Accounts</h3><span className="df-badge df-badge-teal">{users.length}</span></div>
          <div className="flex gap-2"><button className="df-btn df-btn-primary" onClick={beginCreate}><Plus size={16}/> Add account</button><button className="df-btn df-btn-ghost" onClick={loadUsers} aria-label="Refresh accounts"><RefreshCw size={16}/></button></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead><tr className="text-left border-y border-[var(--border)] text-[var(--text-2)]"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Created</th><th className="p-3"></th></tr></thead>
            <tbody>{users.map((account) => <tr key={account.id} className="border-b border-[var(--border)]"><td className="p-3 font-medium">{account.name}</td><td className="p-3">{account.email}</td><td className="p-3"><span className="df-badge df-badge-grey">{account.role}</span></td><td className="p-3 text-[var(--text-2)]">{account.created_at ? new Date(account.created_at).toLocaleString() : "—"}</td><td className="p-3 text-right"><button className="df-btn df-btn-ghost py-1 px-2" onClick={() => beginEdit(account)}><KeyRound size={15}/> Edit</button></td></tr>)}</tbody>
          </table>
          {users.length === 0 && <p className="p-5 text-sm text-[var(--text-2)]">No accounts found.</p>}
        </div>
      </div>

      {editing && <div className="account-modal-overlay" onClick={closeModal} role="presentation">
        <div className="account-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="account-modal-title">
          <div className="account-modal-header"><div className="flex items-center gap-3">{editing.isNew ? <Plus size={19} className="text-[var(--teal)]"/> : <Pencil size={19} className="text-[var(--teal)]"/>}<h2 id="account-modal-title">{editing.isNew ? "Add Login Account" : `Edit ${editing.name}`}</h2></div><button className="pvm-close-btn" onClick={closeModal} aria-label="Close"><X size={18}/></button></div>
          <div className="account-modal-content">
            <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
              <label><span className="df-label">Name</span><input required name="name" value={form.name} onChange={updateForm} className="df-input w-full" placeholder="Full name" /></label>
              <label><span className="df-label">Email</span><input required type="email" name="email" value={form.email} onChange={updateForm} className="df-input w-full" placeholder="name@clinic.com" /></label>
              <label><span className="df-label">Role</span><select name="role" value={form.role} onChange={updateForm} className="df-input w-full"><option value="staff">Staff</option><option value="doctor">Doctor</option><option value="admin">Administrator</option></select></label>
              <label><span className="df-label">{editing.isNew ? "Password" : "New password (leave blank to keep current)"}</span><input required={editing.isNew} minLength="8" type="password" name="password" value={form.password} onChange={updateForm} className="df-input w-full" placeholder="At least 8 characters" autoComplete="new-password" /></label>
              <div className="md:col-span-2 flex gap-3"><button className="df-btn df-btn-primary" disabled={saving}>{saving ? "Saving…" : editing.isNew ? "Create account" : "Save changes"}</button><button type="button" className="df-btn df-btn-ghost" onClick={closeModal}>Cancel</button></div>
            </form>
            {!editing.isNew && <section className="account-history"><div className="flex items-center gap-2"><Clock3 size={17} className="text-[var(--teal)]"/><h3>Password history</h3></div><p>Passwords are never displayed. This audit trail records password actions and their time.</p>{historyLoading ? <p>Loading history…</p> : history.length ? <ul>{history.map((entry) => <li key={entry.id}><span>{entry.event}</span><time>{new Date(entry.changed_at).toLocaleString()}</time><small>by {entry.changed_by || "System"}</small></li>)}</ul> : <p>No password-change history has been recorded for this account.</p>}</section>}
          </div>
        </div>
      </div>}
    </div>
  );
}
