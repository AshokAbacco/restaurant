// client/src/inventory/pages/WastagePage.jsx
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
  ErrorBanner,
} from "../components/ui";

const emptyForm = { ingredientId: "", quantity: "", reason: "", cost: "" };

const WastagePage = () => {
  const [records, setRecords] = useState([]);
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
      setRecords(await inv.getWastageRecords());
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load wastage records");
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
      await inv.createWastageRecord({
        ...form,
        quantity: Number(form.quantity),
        cost: form.cost ? Number(form.cost) : undefined,
      });
      setModalOpen(false);
      load();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to record wastage");
    } finally {
      setSaving(false);
    }
  };

  const totalCost = records.reduce((sum, r) => sum + Number(r.cost), 0);

  return (
    <div>
      <PageHeader
        title="Wastage"
        subtitle={`Spoiled or discarded stock. Total recorded loss: ₹${totalCost.toLocaleString("en-IN")}`}
        action={<Button onClick={openCreate}>+ Record Wastage</Button>}
      />
      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
        ) : records.length === 0 ? (
          <EmptyState title="No wastage recorded" hint="Spoiled or discarded stock will show up here." />
        ) : (
          <Table columns={["Date", "Ingredient", "Qty", "Reason", "Cost"]}>
            {records.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2.5">{new Date(r.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2.5">{r.ingredient?.name}</td>
                <td className="px-4 py-2.5 inv-mono">{r.quantity}</td>
                <td className="px-4 py-2.5">{r.reason}</td>
                <td className="px-4 py-2.5 inv-mono text-[var(--inv-rust)]">
                  ₹{Number(r.cost).toFixed(2)}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} title="Record Wastage" onClose={() => setModalOpen(false)}>
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
          <Field label="Quantity">
            <Input
              type="number"
              step="0.0001"
              required
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </Field>
          <Field label="Reason" hint="e.g. 'Spoiled', 'Dropped during prep'">
            <Input
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </Field>
          <Field label="Cost (₹)" hint="Leave blank to auto-calculate from current average cost">
            <Input
              type="number"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record Wastage"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WastagePage;