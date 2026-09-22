// src/crm/components/CustomerFormModal.jsx
//
// Add / edit a customer. Used by the CRM pages and by the POS ("+ New
// customer" while taking an order). `compact` hides the less common fields
// behind "More details" so the POS flow stays one screen.
import { useEffect, useState } from "react";
import { createCustomer, updateCustomer, listTags } from "../crmApi";
import { Modal, ErrorNote, TagChip, inputClass, labelClass, btnPrimary, btnSecondary } from "./crmUI";

const EMPTY = {
  name: "",
  mobile: "",
  alternateMobile: "",
  email: "",
  address: "",
  landmark: "",
  city: "",
  pincode: "",
  gender: "",
  birthday: "",
  anniversary: "",
  status: "ACTIVE",
  creditLimit: "",
  marketingOptIn: true,
  tagIds: [],
  note: "",
};

function fromCustomer(c) {
  if (!c) return EMPTY;
  return {
    ...EMPTY,
    name: c.name || "",
    mobile: c.mobile || "",
    alternateMobile: c.alternateMobile || "",
    email: c.email || "",
    address: c.address || "",
    landmark: c.landmark || "",
    city: c.city || "",
    pincode: c.pincode || "",
    gender: c.gender || "",
    birthday: c.birthday || "",
    anniversary: c.anniversary || "",
    status: c.status || "ACTIVE",
    creditLimit: c.creditLimit ?? "",
    marketingOptIn: c.marketingOptIn ?? true,
    tagIds: (c.tags || []).map((t) => t.id),
  };
}

export default function CustomerFormModal({
  customer = null, // present = edit
  initialMobile = "",
  initialName = "",
  compact = false,
  source,
  onClose,
  onSaved,
  onUseExisting, // (existingCustomer) => void — offered when the mobile is taken
}) {
  const editing = Boolean(customer?.id);
  const [form, setForm] = useState(() =>
    editing ? fromCustomer(customer) : { ...EMPTY, mobile: initialMobile, name: initialName },
  );
  const [showMore, setShowMore] = useState(!compact || editing);
  const [tags, setTags] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existing, setExisting] = useState(null);

  useEffect(() => {
    listTags().then(setTags).catch(() => setTags([]));
  }, []);

  const set = (key) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleTag = (id) =>
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(id) ? f.tagIds.filter((t) => t !== id) : [...f.tagIds, id],
    }));

  async function handleSubmit(e) {
    e?.preventDefault();
    setError("");
    setExisting(null);

    if (!form.name.trim()) return setError("Enter the customer's name.");
    if (form.mobile.replace(/\D/g, "").length < 7) return setError("Enter a valid mobile number.");

    const payload = {
      ...form,
      creditLimit: form.creditLimit === "" ? null : form.creditLimit,
      birthday: form.birthday || null,
      anniversary: form.anniversary || null,
      gender: form.gender || null,
    };
    if (editing) delete payload.note;
    else if (source) payload.source = source;

    setSaving(true);
    try {
      const saved = editing ? await updateCustomer(customer.id, payload) : await createCustomer(payload);
      onSaved?.(saved);
    } catch (err) {
      if (err.status === 409 && err.data?.existingCustomer) {
        setExisting(err.data.existingCustomer);
      }
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={editing ? "Edit customer" : "Add customer"}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancel
          </button>
          <button type="submit" form="crm-customer-form" disabled={saving} className={btnPrimary}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add customer"}
          </button>
        </>
      }
    >
      <form id="crm-customer-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Customer name *</label>
            <input autoFocus value={form.name} onChange={set("name")} className={inputClass} placeholder="e.g. Rahul Sharma" />
          </div>
          <div>
            <label className={labelClass}>Mobile number *</label>
            <input value={form.mobile} onChange={set("mobile")} inputMode="tel" className={inputClass} placeholder="9876543210" />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={form.email} onChange={set("email")} className={inputClass} placeholder="name@example.com" />
          </div>
          <div>
            <label className={labelClass}>Birthday</label>
            <input type="date" value={form.birthday} onChange={set("birthday")} className={inputClass} />
          </div>
        </div>

        {tags.length > 0 && (
          <div>
            <label className={labelClass}>Groups / tags</label>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => {
                const on = form.tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    className={`rounded-full transition-opacity ${on ? "" : "opacity-45 hover:opacity-80"}`}
                    aria-pressed={on}
                  >
                    <TagChip tag={t} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!showMore ? (
          <button type="button" onClick={() => setShowMore(true)} className="text-xs font-semibold text-[#3FA34D] hover:underline dark:text-[#43B75A]">
            + More details (address, anniversary, credit…)
          </button>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelClass}>Address</label>
              <textarea rows={2} value={form.address} onChange={set("address")} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className={labelClass}>Landmark</label>
              <input value={form.landmark} onChange={set("landmark")} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>City</label>
                <input value={form.city} onChange={set("city")} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Pincode</label>
                <input value={form.pincode} onChange={set("pincode")} inputMode="numeric" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Alternate mobile</label>
              <input value={form.alternateMobile} onChange={set("alternateMobile")} inputMode="tel" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Anniversary</label>
              <input type="date" value={form.anniversary} onChange={set("anniversary")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Gender</label>
              <select value={form.gender} onChange={set("gender")} className={inputClass}>
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Credit limit (₹)</label>
              <input type="number" min="0" value={form.creditLimit} onChange={set("creditLimit")} className={inputClass} placeholder="No limit" />
            </div>
            {editing && (
              <div>
                <label className={labelClass}>Status</label>
                <select value={form.status} onChange={set("status")} className={inputClass}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            )}
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-[#1F2937] dark:text-[#E4E9E2]">
              <input type="checkbox" checked={form.marketingOptIn} onChange={set("marketingOptIn")} className="h-4 w-4 accent-[#3FA34D]" />
              OK to send offers and updates
            </label>
            {!editing && (
              <div className="sm:col-span-2">
                <label className={labelClass}>Note</label>
                <textarea rows={2} value={form.note} onChange={set("note")} className={`${inputClass} resize-none`} placeholder="e.g. Prefers window seat, no onion" />
              </div>
            )}
          </div>
        )}

        <ErrorNote>{error}</ErrorNote>
        {existing && onUseExisting && (
          <button type="button" onClick={() => onUseExisting(existing)} className={btnSecondary}>
            Use existing customer: {existing.name}
          </button>
        )}
      </form>
    </Modal>
  );
}