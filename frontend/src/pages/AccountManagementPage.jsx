import React, { useEffect, useState } from "react";
import { KeyRound, Pencil, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";

const blankAccount = { name: "", email: "", role: "staff", password: "" };

export default function AccountManagementPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blankAccount);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = () => api.get("/admin/users")
    .then((response) => {
      if (Array.isArray(response.data)) {
        setUsers(response.data);
      } else if (response.data && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
      } else {
        setUsers([]);
      }
    })
    .catch((err) => {
      setUsers([]);
      toast.error(formatErr(err) || "Could not load accounts.");
    });

  useEffect(() => { loadUsers(); }, []);

  const updateForm = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const beginEdit = (account) => {
    setEditing(account);
    setForm({ name: account.name, email: account.email, role: account.role, password: "" });
  };
  const cancelEdit = () => { setEditing(null); setForm(blankAccount); };

  const submit = async (event) => {
    event.preventDefault();
    if (!editing && form.password.length < 8) {
      toast.error("Use a password with at least 8 characters.");
      return;
    }
    const payload = { ...form };
    if (editing && !payload.password) delete payload.password;
    setSaving(true);
    try {
      if (editing) await api.put(`/admin/users/${editing.id}`, payload);
      else await api.post("/admin/users", payload);
      toast.success(editing ? "Account updated. Active sessions were revoked if its role or password changed." : "Account created.");
      cancelEdit();
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not save the account.");
    } finally {
      setSaving(false);
    }
  };

  const userList = Array.isArray(users) ? users : [];

  return (
    <div className="space-y-5 df-anim-in" data-testid="accounts-page">
      <div>
        <h1>Account Management</h1>
        <p className="text-[var(--text-2)] mt-1">Create and manage clinic login accounts. Passwords are stored securely and cannot be viewed.</p>
      </div>

      <div className="df-card p-5">
        <div className="flex items-center gap-3 mb-4">
          {editing ? <Pencil size={18} className="text-[var(--teal)]"/> : <Plus size={18} className="text-[var(--teal)]"/>}
          <h3>{editing ? `Edit ${editing.name}` : "Add Login Account"}</h3>
        </div>
        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
          <label><span className="df-label">Name</span><input required name="name" value={form.name} onChange={updateForm} className="df-input w-full" placeholder="Full name" /></label>
          <label><span className="df-label">Email</span><input required type="email" name="email" value={form.email} onChange={updateForm} className="df-input w-full" placeholder="name@clinic.com" /></label>
          <label><span className="df-label">Role</span><select name="role" value={form.role} onChange={updateForm} className="df-input w-full"><option value="staff">Staff</option><option value="doctor">Doctor</option></select></label>
          <label><span className="df-label">{editing ? "New password (leave blank to keep current)" : "Password"}</span><input required={!editing} minLength="8" type="password" name="password" value={form.password} onChange={updateForm} className="df-input w-full" placeholder="At least 8 characters" autoComplete="new-password" /></label>
          <div className="md:col-span-2 flex gap-3">
            <button className="df-btn df-btn-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create account"}</button>
            {editing && <button type="button" className="df-btn df-btn-ghost" onClick={cancelEdit}>Cancel</button>}
          </div>
        </form>
      </div>

      <div className="df-card overflow-hidden">
        <div className="p-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><ShieldCheck size={18} className="text-[var(--teal)]"/><h3>All Login Accounts</h3><span className="df-badge df-badge-teal">{userList.length}</span></div>
          <button className="df-btn df-btn-ghost" onClick={loadUsers} aria-label="Refresh accounts"><RefreshCw size={16}/></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left border-y border-[var(--border)] text-[var(--text-2)]"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Created</th><th className="p-3"></th></tr></thead>
            <tbody>{userList.map((account) => <tr key={account.id} className="border-b border-[var(--border)]"><td className="p-3 font-medium">{account.name}</td><td className="p-3">{account.email}</td><td className="p-3"><span className="df-badge df-badge-grey">{account.role}</span></td><td className="p-3 text-[var(--text-2)]">{account.created_at ? new Date(account.created_at).toLocaleDateString() : "—"}</td><td className="p-3 text-right"><button className="df-btn df-btn-ghost py-1 px-2" onClick={() => beginEdit(account)}><KeyRound size={15}/> Edit</button></td></tr>)}</tbody>
          </table>
          {userList.length === 0 && <p className="p-5 text-sm text-[var(--text-2)]">No accounts found.</p>}
        </div>
      </div>
    </div>
  );
}
