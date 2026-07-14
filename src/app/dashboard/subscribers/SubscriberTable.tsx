"use client";

import { useState, useTransition } from "react";

export type Subscriber = {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  status: "pending" | "active" | "rejected";
  requested_at: string;
  approved_at: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  active: "Approved",
  rejected: "Rejected",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-50 text-yellow-700",
  active: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-600",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

type ModalMode = "add" | "edit";

export default function SubscriberTable({ initialSubscribers }: { initialSubscribers: Subscriber[] }) {
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [isPending, startTransition] = useTransition();
  const [actionId, setActionId] = useState<string | null>(null);

  // 추가/수정 모달
  const [modal, setModal] = useState<{ open: boolean; mode: ModalMode; target?: Subscriber }>({ open: false, mode: "add" });
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string } | null>(null);

  // 삭제 확인
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openAdd() {
    setForm({ name: "", email: "", company: "" });
    setFormError("");
    setCreatedCredentials(null);
    setModal({ open: true, mode: "add" });
  }

  function openEdit(sub: Subscriber) {
    setForm({ name: sub.name ?? "", email: sub.email, company: sub.company ?? "" });
    setFormError("");
    setModal({ open: true, mode: "edit", target: sub });
  }

  function closeModal() {
    setModal({ open: false, mode: "add" });
    setForm({ name: "", email: "", company: "" });
    setFormError("");
    setCreatedCredentials(null);
  }

  async function handleAction(id: string, action: "approve" | "reject") {
    setActionId(id);
    startTransition(async () => {
      const res = await fetch("/api/subscribers/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) {
        setSubscribers((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, status: action === "approve" ? "active" : "rejected", approved_at: new Date().toISOString() }
              : s
          )
        );
      }
      setActionId(null);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    if (modal.mode === "add") {
      const res = await fetch("/api/subscribers/manual-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "An error occurred."); setSaving(false); return; }
      setSubscribers((prev) => [{
        id: crypto.randomUUID(),
        name: form.name, email: form.email, company: form.company || null,
        status: "active", requested_at: new Date().toISOString(), approved_at: new Date().toISOString(),
      }, ...prev]);
      setSaving(false);
      if (data.username) {
        setCreatedCredentials({ username: data.username });
      } else {
        closeModal();
      }
      return;
    } else {
      const res = await fetch("/api/subscribers/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: modal.target?.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "An error occurred."); setSaving(false); return; }
      setSubscribers((prev) =>
        prev.map((s) => s.id === modal.target?.id
          ? { ...s, name: form.name, email: form.email, company: form.company || null }
          : s)
      );
    }

    closeModal();
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch("/api/subscribers/update", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: deleteTarget.id }),
    });
    if (res.ok) {
      setSubscribers((prev) => prev.filter((s) => s.id !== deleteTarget.id));
    }
    setDeleteTarget(null);
    setDeleting(false);
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{subscribers.length}</span>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-white transition-colors cursor-pointer"
          style={{ backgroundColor: "#014A99" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Subscriber
        </button>
      </div>

      {/* Table */}
      {subscribers.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No subscription requests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Company</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 w-24">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 w-32">Requested</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500 w-40">Action</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => (
                <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                  <td className="py-3 px-4 text-gray-800 font-medium">{sub.name ?? "—"}</td>
                  <td className="py-3 px-4 text-gray-600">{sub.email}</td>
                  <td className="py-3 px-4 text-gray-500">{sub.company ?? "—"}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[sub.status]}`}>
                      {STATUS_LABEL[sub.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500 whitespace-nowrap">{formatDate(sub.requested_at)}</td>
                  <td className="py-3 px-4">
                    {sub.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(sub.id, "approve")}
                          disabled={isPending && actionId === sub.id}
                          className="text-xs px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50 cursor-pointer"
                        >Approve</button>
                        <button
                          onClick={() => handleAction(sub.id, "reject")}
                          disabled={isPending && actionId === sub.id}
                          className="text-xs px-2.5 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 cursor-pointer"
                        >Reject</button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">{formatDate(sub.approved_at)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(sub)} className="text-gray-400 hover:text-blue-500 transition-colors cursor-pointer" title="Edit">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setDeleteTarget(sub)} className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer" title="Delete">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/edit modal */}
      {modal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {createdCredentials ? "Account Created" : modal.mode === "add" ? "Add Subscriber Manually" : "Edit Subscriber Info"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {createdCredentials ? (
              <div className="px-6 py-5 flex flex-col gap-4">
                <p className="text-sm text-gray-600">The subscriber and login account have been created.</p>
                <div className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-4 flex flex-col gap-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Username</span>
                    <span className="font-mono font-semibold text-gray-900">{createdCredentials.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Password</span>
                    <span className="font-mono font-semibold text-gray-900">{createdCredentials.username}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">
                  The username is the part of the email address before the @, and the password is the same as the username.
                </p>
                <button onClick={closeModal}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors cursor-pointer"
                  style={{ backgroundColor: "#014A99" }}>
                  OK
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Name <span className="text-red-500">*</span></label>
                  <input type="text" required value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#014A99] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email <span className="text-red-500">*</span></label>
                  <input type="email" required value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="example@company.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#014A99] transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Company <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="text" value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Topdignus Inc."
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#014A99] transition-colors" />
                </div>
                {modal.mode === "add" && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3.5 py-3 text-xs text-blue-700 leading-relaxed">
                    A login account will be created automatically.<br />
                    The username is the part of the email before the @, and the password is the same as the username.
                  </div>
                )}
                {formError && <p className="text-xs text-red-500 -mt-1">{formError}</p>}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={closeModal}
                    className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-colors cursor-pointer"
                    style={{ backgroundColor: "#014A99" }}>
                    {saving ? "Processing..." : modal.mode === "add" ? "Add & Create Account" : "Save"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-2">Delete Subscriber</h2>
            <p className="text-sm text-gray-500 mb-1">
              Delete subscriber <span className="font-medium text-gray-800">{deleteTarget.name ?? deleteTarget.email}</span>?
            </p>
            <p className="text-xs text-red-500 mb-5">The linked login account will also be deleted.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-60 transition-colors cursor-pointer">
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
