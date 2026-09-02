// ==============================================
// src/settings/branches/BranchesSettings.jsx
// ==============================================
// Owner-facing management for the organization's outlets (branches).
//
// These are the same records that appear on the login "Choose an outlet"
// screen and in the header OutletSwitcher — both read
// resolveAccessibleOutlets() in auth.service.js, which returns every
// isActive outlet in the organization for OWNER/ADMIN. So anything created
// here shows up in both places on the next login/refresh.
//
// Backed by /api/stores (server/src/stores/) — already built; this page is
// just the UI for it. Note the role split enforced there:
//   GET/PUT  -> OWNER, ADMIN, MANAGER   (mount-level guard in index.js)
//   POST/DEL -> OWNER only              (extra requireRole in stores.routes.js)
// so the Add/Delete controls are hidden for non-owners rather than letting
// them click through to a 403.
//
// This supersedes the old Expenses -> Stores page, which sat next to
// suppliers and purchase orders where "Stores" reads as storerooms rather
// than branches, and which had no GSTIN field even though the backend
// accepts one and invoices are per-outlet.

import React, { useEffect, useState } from "react";
import {
  FiMapPin,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiPhone,
  FiHome,
  FiFileText,
} from "react-icons/fi";
import { apiRequest } from "../../api/apiClient";
import { useAuth } from "../../auth/AuthContext";

const EMPTY_FORM = {
  name: "",
  address: "",
  phone: "",
  gstin: "",
  fssai: "",
  tagline: "",
};

// GSTIN is 15 chars: 2 state digits, 10-char PAN, entity digit, 'Z', checksum.
// Validated only when something was actually typed — the backend treats it
// as optional and stores null, and plenty of small outlets don't have one.
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

const BranchesSettings = () => {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";
  const currentOutletId = user?.outlet?.id;

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // null = closed, "new" = creating, otherwise the id being edited
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    const { ok, data } = await apiRequest("/stores");
    if (!ok) {
      setError(data?.message || data?.error || "Failed to load branches.");
    } else {
      setBranches(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setFormError("");
    setNotice("");
  }

  function startEdit(branch) {
    setEditingId(branch.id);
    setForm({
      name: branch.name || "",
      address: branch.address || "",
      phone: branch.phone || "",
      gstin: branch.gstin || "",
      fssai: branch.fssai || "",
      tagline: branch.tagline || "",
    });
    setFormError("");
    setNotice("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const name = form.name.trim();
    if (name.length < 2) {
      setFormError("Give the branch a name of at least 2 characters.");
      return;
    }

    const gstin = form.gstin.trim().toUpperCase();
    if (gstin && !GSTIN_PATTERN.test(gstin)) {
      setFormError(
        "That doesn't look like a valid 15-character GSTIN. Leave it blank if this branch doesn't have one yet.",
      );
      return;
    }

    setSaving(true);
    setFormError("");

    const isNew = editingId === "new";
    const { ok, data } = await apiRequest(
      isNew ? "/stores" : `/stores/${editingId}`,
      {
        method: isNew ? "POST" : "PUT",
        body: JSON.stringify({
          name,
          address: form.address.trim() || null,
          phone: form.phone.trim() || null,
          gstin: gstin || null,
          fssai: form.fssai.trim() || null,
          tagline: form.tagline.trim() || null,
        }),
      },
    );

    setSaving(false);

    if (!ok) {
      setFormError(
        data?.message || data?.error || "Couldn't save that branch.",
      );
      return;
    }

    cancelEdit();
    // A brand-new outlet has no menu, no tables and no kitchen sections, and
    // nothing can be ordered from it until at least the kitchen sections and
    // menu exist. Saying so here is far cheaper than letting someone find out
    // when "Send to Kitchen" refuses the order.
    setNotice(
      isNew
        ? `"${name}" created. It starts empty — switch into it and set up Kitchen Sections first, then Menu, then Tables, before taking orders.`
        : `"${name}" updated.`,
    );
    load();
  }

  // Brings a deactivated branch back. Deactivation is a soft delete
  // (stores.service.js sets isActive: false) and getAllOutlets returns
  // inactive outlets too, so without this the branch would sit in this list
  // permanently with no way back — it just wouldn't appear on the login
  // picker, which reads only isActive outlets.
  async function handleRestore(branch) {
    setError("");
    const { ok, data } = await apiRequest(`/stores/${branch.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        gstin: branch.gstin,
        fssai: branch.fssai,
        tagline: branch.tagline,
        isActive: true,
      }),
    });
    if (!ok) {
      setError(data?.message || data?.error || "Couldn't restore that branch.");
      return;
    }
    setNotice(`"${branch.name}" restored. It's back in the outlet picker.`);
    load();
  }

  async function handleDelete(id) {
    setError("");
    const { ok, data } = await apiRequest(`/stores/${id}`, {
      method: "DELETE",
    });
    setConfirmDeleteId(null);
    if (!ok) {
      setError(data?.message || data?.error || "Couldn't remove that branch.");
      return;
    }
    setNotice("Branch deactivated. It no longer appears in the outlet picker.");
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410] flex items-center justify-center">
        <p className="text-[#6B7280] dark:text-[#9CA8A0]">Loading branches…</p>
      </div>
    );
  }

  const isFormOpen = editingId !== null;

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-4xl mx-auto px-8 py-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center">
            <FiMapPin size={30} />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">Branches</h1>
            <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
              Every outlet in this restaurant. These are what staff choose
              between when they log in, and what the header switcher moves
              between. Menu, tables, stock and staff are all kept separate per
              branch.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8">
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-5 py-4 text-red-700 dark:text-red-400">
            <FiAlertCircle className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-5 py-4 text-emerald-800 dark:text-emerald-300">
            <FiCheck className="mt-0.5 shrink-0" />
            <span>{notice}</span>
          </div>
        )}

        {!isOwner && (
          <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-5 py-4 text-amber-800 dark:text-amber-300">
            You can view and edit branch details, but only the account Owner
            can add or remove a branch.
          </div>
        )}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
              {branches.length} branch{branches.length === 1 ? "" : "es"}
            </h2>
            {isOwner && !isFormOpen && (
              <button
                onClick={startCreate}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 dark:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 dark:hover:bg-emerald-600"
              >
                <FiPlus /> Add Branch
              </button>
            )}
          </div>

          {editingId === "new" && (
            <BranchForm
              form={form}
              setField={setField}
              onSave={handleSave}
              onCancel={cancelEdit}
              saving={saving}
              error={formError}
              submitLabel="Create Branch"
            />
          )}

          {branches.length === 0 && editingId !== "new" ? (
            <p className="text-center text-[#9CA3AF] dark:text-[#6B7280] py-10">
              No branches yet.
            </p>
          ) : (
            <div className="space-y-3">
              {branches.map((branch) =>
                editingId === branch.id ? (
                  <BranchForm
                    key={branch.id}
                    form={form}
                    setField={setField}
                    onSave={handleSave}
                    onCancel={cancelEdit}
                    saving={saving}
                    error={formError}
                    submitLabel="Save Changes"
                  />
                ) : (
                  <div
                    key={branch.id}
                    className="flex items-start justify-between gap-4 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-4"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <FiHome />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                            {branch.name}
                          </p>
                          {branch.id === currentOutletId && (
                            <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                              You're here
                            </span>
                          )}
                          {branch.isActive === false && (
                            <span className="rounded-full bg-gray-100 dark:bg-[#262B24] px-2 py-0.5 text-xs font-semibold text-gray-500 dark:text-[#9CA8A0]">
                              Inactive
                            </span>
                          )}
                        </div>
                        {branch.address && (
                          <p className="mt-1 flex items-start gap-1.5 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                            <FiMapPin className="mt-0.5 shrink-0" size={13} />
                            {branch.address}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-4">
                          {branch.phone && (
                            <p className="flex items-center gap-1.5 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                              <FiPhone size={13} /> {branch.phone}
                            </p>
                          )}
                          {branch.gstin ? (
                            <p className="flex items-center gap-1.5 font-mono text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                              <FiFileText size={13} /> {branch.gstin}
                            </p>
                          ) : (
                            // Flagged rather than left blank: invoices are
                            // generated per outlet, so a branch with no GSTIN
                            // will print bills without one.
                            <p className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                              <FiAlertCircle size={13} /> No GSTIN set
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {confirmDeleteId === branch.id ? (
                        <>
                          <button
                            onClick={() => handleDelete(branch.id)}
                            className="rounded-lg bg-red-600 dark:bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 dark:hover:bg-red-600"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-lg border border-[#E7EAE1] dark:border-[#262B24] text-[#1F2937] dark:text-[#E4E9E2] px-3 py-2 text-sm hover:bg-[#F3F5EE] dark:hover:bg-[#1D231C]"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(branch)}
                            disabled={isFormOpen}
                            title="Edit branch"
                            className="rounded-lg border border-[#E7EAE1] dark:border-[#262B24] p-2 text-gray-600 dark:text-[#9CA8A0] hover:bg-gray-50 dark:hover:bg-[#1D231C] disabled:opacity-40"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          {isOwner && branch.isActive === false && (
                            <button
                              onClick={() => handleRestore(branch)}
                              disabled={isFormOpen}
                              title="Restore branch"
                              className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 disabled:opacity-40"
                            >
                              Restore
                            </button>
                          )}
                          {isOwner && branch.isActive !== false && (
                            <button
                              // The branch you're currently working in can't be
                              // removed — deactivating it would strip the outlet
                              // out from under your own live session.
                              onClick={() => setConfirmDeleteId(branch.id)}
                              disabled={
                                isFormOpen ||
                                branch.id === currentOutletId ||
                                branches.length === 1
                              }
                              title={
                                branch.id === currentOutletId
                                  ? "Switch to another branch before removing this one"
                                  : branches.length === 1
                                    ? "An organization needs at least one branch"
                                    : "Remove branch"
                              }
                              className="rounded-lg border border-[#E7EAE1] dark:border-[#262B24] p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-40"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
          A new branch starts completely empty — nothing is shared between
          outlets. Set up <strong>Kitchen Sections</strong> first, then{" "}
          <strong>Menu</strong> (assigning each item a kitchen section),
          then <strong>Tables</strong>, then <strong>Employees</strong>. A menu
          item with no kitchen section can't be sent to the kitchen.
        </p>
      </div>

      <KitchenBranchesPanel isOwner={isOwner} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────
// KITCHEN BRANCHES — the physical kitchens inside the CURRENT restaurant
// branch. "Ground Floor Kitchen", "Rooftop Kitchen".
//
// Deliberately scoped to the outlet you're currently switched into, because
// that's what the API is scoped to: /api/kitchen-branches derives outletId
// from your access token, never from a request body. To manage another
// branch's kitchens, switch to it with the header switcher first. The heading
// says so, so nobody wonders why the list didn't change when they scrolled
// past a different branch above.
//
// NOT the same thing as a Kitchen SECTION (Grill Station, Beverage Station).
// Sections are functional stations that menu items route to automatically;
// a kitchen branch is a whole physical kitchen that an ORDER routes to. A
// ticket carries both.
// ─────────────────────────────────────────────────────────────────────────
const KitchenBranchesPanel = ({ isOwner }) => {
  const [kitchens, setKitchens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    // includeInactive so a deactivated kitchen stays visible and restorable,
    // matching how deactivated branches behave in the list above.
    const { ok, data } = await apiRequest("/kitchen-branches?includeInactive=true");
    setKitchens(ok && Array.isArray(data) ? data : []);
    if (!ok) setError(data?.error || data?.message || "Couldn't load kitchens.");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the kitchen a name.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    const { ok, data } = await apiRequest("/kitchen-branches", {
      method: "POST",
      body: JSON.stringify({ name: trimmed }),
    });
    setSaving(false);
    if (!ok) {
      setError(data?.error || data?.message || "Couldn't create that kitchen.");
      return;
    }
    setName("");
    setNotice(
      `"${trimmed}" created. It now appears in the POS "Send to kitchen" picker and as a tab on the Kitchen Display.`,
    );
    load();
  }

  async function handleRename(kitchen) {
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    const { ok, data } = await apiRequest(`/kitchen-branches/${kitchen.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: trimmed }),
    });
    setSaving(false);
    if (!ok) {
      setError(data?.error || data?.message || "Couldn't rename that kitchen.");
      return;
    }
    setEditingId(null);
    load();
  }

  async function handleToggleActive(kitchen) {
    setError("");
    setNotice("");
    if (kitchen.isActive) {
      // DELETE is a soft deactivate. The server refuses with 409 while the
      // kitchen still has unfinished tickets — deactivating mid-service would
      // make live tickets vanish off the display they're being cooked on.
      const { ok, data } = await apiRequest(`/kitchen-branches/${kitchen.id}`, {
        method: "DELETE",
      });
      if (!ok) {
        setError(data?.error || data?.message || "Couldn't deactivate that kitchen.");
        return;
      }
      setNotice(`"${kitchen.name}" deactivated. New orders can no longer be sent to it.`);
    } else {
      const { ok, data } = await apiRequest(`/kitchen-branches/${kitchen.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: true }),
      });
      if (!ok) {
        setError(data?.error || data?.message || "Couldn't restore that kitchen.");
        return;
      }
      setNotice(`"${kitchen.name}" restored.`);
    }
    load();
  }

  return (
    <div className="mt-8 rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] p-6">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-[#1F2937] dark:text-[#E4E9E2]">Kitchens</h2>
        <span className="rounded-full bg-gray-100 dark:bg-[#262B24] px-2 py-0.5 text-xs font-semibold text-gray-600 dark:text-[#9CA8A0]">
          {kitchens.length}
        </span>
      </div>
      <p className="mb-5 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
        Physical kitchens in the branch you're currently switched into — one
        per floor or cooking area. Orders are routed to one of these at
        Send&nbsp;to&nbsp;Kitchen, and each kitchen's display shows only its
        own tickets. To manage another branch's kitchens, switch to it using
        the outlet switcher in the header.
      </p>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <FiAlertCircle className="mt-0.5 shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {isOwner && (
        <div className="mb-5 flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Ground Floor Kitchen"
            className="h-10 min-w-56 flex-1 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] px-3 text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 dark:bg-emerald-500 px-4 h-10 text-sm font-semibold text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-60"
          >
            <FiPlus size={15} /> Add Kitchen
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">Loading kitchens…</p>
      ) : kitchens.length === 0 ? (
        <p className="rounded-lg bg-gray-50 dark:bg-[#1D231C] px-4 py-6 text-center text-sm text-[#6B7280] dark:text-[#9CA8A0]">
          No kitchens yet. With none configured, orders go to the kitchen
          unrouted and appear on every display — which is exactly right if you
          only have one kitchen.
        </p>
      ) : (
        <ul className="divide-y divide-[#E7EAE1] dark:divide-[#262B24] rounded-xl border border-[#E7EAE1] dark:border-[#262B24]">
          {kitchens.map((k) => (
            <li key={k.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                {editingId === k.id ? (
                  <input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleRename(k)}
                    className="h-9 w-full max-w-sm rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] px-3 text-sm"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#1F2937] dark:text-[#E4E9E2]">{k.name}</span>
                    {k.isActive === false && (
                      <span className="rounded-full bg-gray-100 dark:bg-[#262B24] px-2 py-0.5 text-xs font-semibold text-gray-500 dark:text-[#9CA8A0]">
                        Inactive
                      </span>
                    )}
                    {k.floor?.name && (
                      <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                        {k.floor.name}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {isOwner && (
                <div className="flex shrink-0 items-center gap-2">
                  {editingId === k.id ? (
                    <>
                      <button
                        onClick={() => handleRename(k)}
                        disabled={saving}
                        className="rounded-lg bg-emerald-600 dark:bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="rounded-lg border border-[#E7EAE1] dark:border-[#262B24] text-[#1F2937] dark:text-[#E4E9E2] px-3 py-1.5 text-sm hover:bg-[#F3F5EE] dark:hover:bg-[#1D231C]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(k.id);
                          setEditingName(k.name);
                        }}
                        title="Rename kitchen"
                        className="rounded-lg border border-[#E7EAE1] dark:border-[#262B24] p-2 text-gray-600 dark:text-[#9CA8A0] hover:bg-gray-50 dark:hover:bg-[#1D231C]"
                      >
                        <FiEdit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(k)}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
                          k.isActive
                            ? "text-red-600 hover:bg-red-50"
                            : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                      >
                        {k.isActive ? "Deactivate" : "Restore"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Shared by the create row and the inline edit row so both always accept
// exactly the same fields — including gstin, which the old Expenses -> Stores
// modal left out despite the backend accepting it.
const BranchForm = ({
  form,
  setField,
  onSave,
  onCancel,
  saving,
  error,
  submitLabel,
}) => (
  <div className="mb-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-5">
    {error && (
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-100 dark:bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
        <FiAlertCircle className="mt-0.5 shrink-0" /> {error}
      </div>
    )}

    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-[#1F2937] dark:text-[#E4E9E2]">
          Branch name <span className="text-red-500">*</span>
        </label>
        <input
          autoFocus
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="e.g. Anna Nagar Branch"
          className="h-10 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] px-3 text-sm"
        />
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-[#1F2937] dark:text-[#E4E9E2]">
          Address
        </label>
        <input
          value={form.address}
          onChange={(e) => setField("address", e.target.value)}
          placeholder="Street, area, city"
          className="h-10 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] px-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[#1F2937] dark:text-[#E4E9E2]">
          Phone
        </label>
        <input
          value={form.phone}
          onChange={(e) => setField("phone", e.target.value)}
          placeholder="e.g. +91 98765 43210"
          className="h-10 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] px-3 text-sm"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[#1F2937] dark:text-[#E4E9E2]">
          GSTIN
        </label>
        <input
          value={form.gstin}
          // Uppercased as you type — GSTINs are always uppercase, and the
          // validation pattern expects it.
          onChange={(e) => setField("gstin", e.target.value.toUpperCase())}
          placeholder="e.g. 27AAPFU0939F1ZV"
          maxLength={15}
          className="h-10 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] px-3 font-mono text-sm"
        />
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA8A0]">
          Optional. Appears on this branch's invoices.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-[#1F2937] dark:text-[#E4E9E2]">
          FSSAI licence no.
        </label>
        <input
          value={form.fssai}
          onChange={(e) => setField("fssai", e.target.value)}
          placeholder="e.g. 11223344005566"
          maxLength={20}
          className="h-10 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] px-3 font-mono text-sm"
        />
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA8A0]">
          Printed alongside the GSTIN on the bill header. Legally required on
          restaurant invoices in India.
        </p>
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium text-[#1F2937] dark:text-[#E4E9E2]">
          Tagline
        </label>
        <input
          value={form.tagline}
          onChange={(e) => setField("tagline", e.target.value)}
          placeholder="e.g. Authentic Multi-Cuisine Fine Dining"
          maxLength={120}
          className="h-10 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] px-3 text-sm"
        />
        <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA8A0]">
          Optional line printed under the restaurant name on the bill.
        </p>
      </div>
    </div>

    <div className="mt-5 flex items-center gap-2">
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-lg bg-emerald-600 dark:bg-emerald-500 px-5 h-10 text-sm font-semibold text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-60"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
      <button
        onClick={onCancel}
        disabled={saving}
        className="flex items-center gap-1.5 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] px-4 h-10 text-sm disabled:opacity-60"
      >
        <FiX size={15} /> Cancel
      </button>
    </div>
  </div>
);

export default BranchesSettings;