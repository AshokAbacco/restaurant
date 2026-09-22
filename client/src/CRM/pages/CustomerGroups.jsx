// src/crm/pages/CustomerGroups.jsx
//
// Customer groups / tags ("VIP", "Corporate", "Weekend regulars"). Anyone
// can assign groups on a customer; only managers create, rename or delete
// them (the server enforces the same).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { listTags, createTag, updateTag, deleteTag } from "../crmApi";
import { useAuth } from "../../auth/AuthContext";
import CrmTabs from "../components/CrmTabs";
import {
  CRM_MANAGER_ROLES, CrmPage, Modal, TagChip, ErrorNote, EmptyState,
  cardClass, inputClass, labelClass, btnPrimary, btnSecondary,
} from "../components/crmUI";

const COLORS = ["#3FA34D", "#2563EB", "#D97706", "#E11D48", "#7C3AED", "#0891B2", "#EA580C", "#6B7280"];

function TagModal({ tag, onClose, onSaved }) {
  const [form, setForm] = useState({ name: tag?.name || "", color: tag?.color || COLORS[0], description: tag?.description || "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      onSaved(tag ? await updateTag(tag.id, form) : await createTag(form));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={tag ? "Edit group" : "New group"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button form="crm-tag-form" disabled={saving} className={btnPrimary}>{saving ? "Saving…" : tag ? "Save changes" : "Create group"}</button>
        </>
      }
    >
      <form id="crm-tag-form" onSubmit={save} className="space-y-3">
        <div><label className={labelClass}>Name *</label><input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Corporate" /></div>
        <div>
          <label className={labelClass}>Colour</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setForm({ ...form, color: c })}
                className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-white dark:ring-offset-[#171C17] ${form.color === c ? "ring-2 ring-[#1F2937] dark:ring-white" : ""}`}
                style={{ backgroundColor: c }}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </div>
        <div><label className={labelClass}>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} placeholder="Who belongs in this group?" /></div>
        <div className="pt-1"><TagChip tag={{ name: form.name || "Preview", color: form.color }} /></div>
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Modal>
  );
}

export default function CustomerGroups() {
  const { user } = useAuth();
  const canManage = CRM_MANAGER_ROLES.includes(user?.role);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // tag | "new"

  const load = () => listTags().then(setTags).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function remove(t) {
    if (!window.confirm(`Delete the group "${t.name}"? Customers stay; they just lose this tag.`)) return;
    try {
      await deleteTag(t.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <CrmPage
      title="Customer groups"
      subtitle="Tag customers to find and message them together."
      tabs={<CrmTabs />}
      actions={canManage && <button onClick={() => setEditing("new")} className={btnPrimary}><FiPlus /> New group</button>}
    >
      <ErrorNote>{error}</ErrorNote>
      {tags.length === 0 ? (
        <EmptyState action={canManage && <button onClick={() => setEditing("new")} className={btnPrimary}><FiPlus /> New group</button>}>
          No groups yet. Try "VIP", "Corporate" or "Weekend regulars".
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((t) => (
            <div key={t.id} className={`${cardClass} p-4`}>
              <div className="flex items-start justify-between gap-2">
                <TagChip tag={t} />
                {canManage && (
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(t)} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/5" aria-label="Edit group"><FiEdit2 size={14} /></button>
                    <button onClick={() => remove(t)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" aria-label="Delete group"><FiTrash2 size={14} /></button>
                  </div>
                )}
              </div>
              {t.description && <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA8A0]">{t.description}</p>}
              <Link to={`/crm/customers?tagId=${t.id}`} className="mt-3 inline-block text-sm font-semibold text-[#3FA34D] hover:underline dark:text-[#43B75A]">
                {t.customerCount} customer{t.customerCount === 1 ? "" : "s"}
              </Link>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <TagModal
          tag={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </CrmPage>
  );
}