// client/src/inventory/components/SimpleCrudTable.jsx
import { useEffect, useState } from "react";
import { PageHeader, Card, Table, EmptyState, Button, Modal, Field, Input, ErrorBanner } from "./ui";

/**
 * Generic list + create/edit + delete screen for flat, single-table
 * resources (Units, Ingredient Categories). Anything with nested data or
 * cross-resource logic (Ingredients, Purchase Orders, etc.) gets its own
 * bespoke page instead of being forced through this.
 */
const SimpleCrudTable = ({
  title,
  subtitle,
  columns,
  fields,
  api, // { list, create, update, remove }
  renderRow, // (item) => [cellValues in column order]
  emptyHint,
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await api.list());
    } catch (e) {
      setError(e?.response?.data?.message || `Failed to load ${title.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({});
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm(item);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.update(editing.id, form);
      } else {
        await api.create(form);
      }
      setModalOpen(false);
      load();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return;
    try {
      await api.remove(item.id);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete — it may still be in use");
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        action={<Button onClick={openCreate}>+ Add {title.replace(/s$/, "")}</Button>}
      />
      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
        ) : items.length === 0 ? (
          <EmptyState title={`No ${title.toLowerCase()} yet`} hint={emptyHint} />
        ) : (
          <Table columns={[...columns, ""]}>
            {items.map((item) => (
              <tr key={item.id}>
                {renderRow(item).map((cell, i) => (
                  <td key={i} className="px-4 py-2.5">
                    {cell}
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => openEdit(item)}
                    className="text-sm text-[var(--inv-pine)] hover:underline mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="text-sm text-[var(--inv-rust)] hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? `Edit ${title.replace(/s$/, "")}` : `Add ${title.replace(/s$/, "")}`}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {fields.map((f) => (
            <Field key={f.name} label={f.label}>
              <Input
                type={f.type || "text"}
                required={f.required}
                value={form[f.name] ?? ""}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              />
            </Field>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SimpleCrudTable;