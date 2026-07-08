// client/src/inventory/pages/AdjustmentsPage.jsx
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
  Select,
  TicketPill,
  ErrorBanner,
} from "../components/ui";

const emptyForm = { ingredientId: "", type: "INCREASE", quantity: "", reason: "", approvedBy: "", notes: "" };

const AdjustmentsPage = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setAdjustments(await inv.getAdjustments());
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load adjustments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    inv.getIngredients().then(setIngredients);
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await inv.createAdjustment({ ...form, quantity: Number(form.quantity) });
      setModalOpen(false);
      load();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to create adjustment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Stock Adjustments"
        subtitle="Manual corrections — count discrepancies, damaged goods, data-entry fixes."
        action={<Button onClick={openCreate}>+ New Adjustment</Button>}
      />
      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
        ) : adjustments.length === 0 ? (
          <EmptyState title="No adjustments recorded" hint="Corrections you make to stock will show up here." />
        ) : (
          <Table columns={["Date", "Ingredient", "Type", "Qty", "Reason", "Approved By"]}>
            {adjustments.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-2.5">{new Date(a.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2.5">{a.ingredient?.name}</td>
                <td className="px-4 py-2.5">
                  <TicketPill tone={a.type === "INCREASE" ? "good" : "bad"}>{a.type}</TicketPill>
                </td>
                <td className="px-4 py-2.5 inv-mono">{a.quantity}</td>
                <td className="px-4 py-2.5">{a.reason}</td>
                <td className="px-4 py-2.5">{a.approvedBy || "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} title="New Stock Adjustment" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <Field label="Ingredient">
            <Select
              required
              value={form.ingredientId}
              onChange={(e) => setForm({ ...form, ingredientId: e.target.value })}
            >
              <option value="">Select…</option>
              {ingredients.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="INCREASE">Increase</option>
              <option value="DECREASE">Decrease</option>
            </Select>
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              step="0.0001"
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Field>
          <Field label="Reason" hint="Required — e.g. 'Physical count discrepancy'">
            <Input
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </Field>
          <Field label="Approved By">
            <Input
              value={form.approvedBy}
              onChange={(e) => setForm({ ...form, approvedBy: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save Adjustment"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdjustmentsPage;