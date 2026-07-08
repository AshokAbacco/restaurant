// client/src/inventory/pages/SuppliersPage.jsx
import { useEffect, useState } from "react";
import * as inv from "../api/inventoryApi";
import {
  PageHeader,
  Card,
  Table,
  EmptyState,
  Button,
  Modal,
  Field,
  Input,
  Textarea,
  ErrorBanner,
} from "../components/ui";

const emptyForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  gstNumber: "",
  address: "",
  paymentTerms: "",
};

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [historyFor, setHistoryFor] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setSuppliers(await inv.getSuppliers());
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ ...emptyForm, ...s });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await inv.updateSupplier(editing.id, form);
      else await inv.createSupplier(form);
      setModalOpen(false);
      load();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!confirm(`Delete "${s.name}"?`)) return;
    try {
      await inv.deleteSupplier(s.id);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete — check for existing purchase history");
    }
  };

  const openHistory = async (s) => {
    setHistoryFor(s);
    setHistoryLoading(true);
    try {
      setHistory(await inv.getSupplierHistory(s.id));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load purchase history");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="Vendors you purchase ingredients from."
        action={<Button onClick={openCreate}>+ Add Supplier</Button>}
      />
      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
        ) : suppliers.length === 0 ? (
          <EmptyState title="No suppliers yet" hint="Add a supplier before creating purchase orders." />
        ) : (
          <Table columns={["Name", "Contact", "Phone", "Payment Terms", "Outstanding", ""]}>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2.5 font-medium">{s.name}</td>
                <td className="px-4 py-2.5">{s.contactPerson || "—"}</td>
                <td className="px-4 py-2.5 inv-mono">{s.phone || "—"}</td>
                <td className="px-4 py-2.5">{s.paymentTerms || "—"}</td>
                <td className="px-4 py-2.5 inv-mono">
                  ₹{Number(s.outstandingBalance ?? 0).toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <button
                    onClick={() => openHistory(s)}
                    className="text-sm text-[var(--inv-pine)] hover:underline mr-3"
                  >
                    History
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    className="text-sm text-[var(--inv-pine)] hover:underline mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
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
        title={editing ? "Edit Supplier" : "Add Supplier"}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Contact Person">
            <Input
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="GST Number">
            <Input
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
            />
          </Field>
          <Field label="Payment Terms">
            <Input
              placeholder="e.g. Net 15 days"
              value={form.paymentTerms}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Address">
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </Field>
          </div>
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!historyFor}
        title={`Purchase history — ${historyFor?.name || ""}`}
        onClose={() => setHistoryFor(null)}
        wide
      >
        {historyLoading ? (
          <p className="text-sm text-[var(--inv-steel)]">Loading…</p>
        ) : history.length === 0 ? (
          <EmptyState
            title="No purchases recorded yet"
            hint="Purchase entries received from this supplier will show up here."
          />
        ) : (
          <Table columns={["Date", "Ingredient", "Qty", "Invoice", "Total"]}>
            {history.map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-2.5">{new Date(h.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2.5">{h.ingredient?.name}</td>
                <td className="px-4 py-2.5 inv-mono">{h.quantityReceived}</td>
                <td className="px-4 py-2.5">{h.invoiceNumber || "—"}</td>
                <td className="px-4 py-2.5 inv-mono">₹{Number(h.totalAmount).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </Table>
        )}
      </Modal>
    </div>
  );
};

export default SuppliersPage;