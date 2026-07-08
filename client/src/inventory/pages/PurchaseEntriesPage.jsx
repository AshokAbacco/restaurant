// client/src/inventory/pages/PurchaseEntriesPage.jsx
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

const emptyForm = {
  purchaseOrderId: "",
  supplierId: "",
  ingredientId: "",
  invoiceNumber: "",
  batchNumber: "",
  expiryDate: "",
  quantityReceived: "",
  purchasePrice: "",
  gstPercent: 0,
  discount: 0,
};

const PurchaseEntriesPage = () => {
  const [entries, setEntries] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setEntries(await inv.getPurchaseEntries());
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load purchase entries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    inv.getSuppliers().then(setSuppliers);
    inv.getIngredients().then(setIngredients);
    inv.getPurchaseOrders({ status: "ORDERED" }).then(setPurchaseOrders);
  }, []);

  const openCreate = () => {
    setForm(emptyForm);
    setModalOpen(true);
  };

  const selectedIngredient = ingredients.find((i) => i.id === form.ingredientId);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await inv.createPurchaseEntry({
        ...form,
        purchaseOrderId: form.purchaseOrderId || undefined,
        expiryDate: form.expiryDate || undefined,
        quantityReceived: Number(form.quantityReceived),
        purchasePrice: Number(form.purchasePrice),
        gstPercent: Number(form.gstPercent || 0),
        discount: Number(form.discount || 0),
      });
      setModalOpen(false);
      load();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to record purchase entry");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Purchase Entries"
        subtitle="Goods actually received — this is what moves stock and updates average cost."
        action={<Button onClick={openCreate}>+ Record Goods Received</Button>}
      />
      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
        ) : entries.length === 0 ? (
          <EmptyState
            title="No purchase entries yet"
            hint="Record goods received to bring stock in and update average cost."
          />
        ) : (
          <Table columns={["Date", "Ingredient", "Supplier", "Qty Received", "Price/Unit", "Total", "Invoice"]}>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-2.5">{new Date(e.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2.5">{e.ingredient?.name}</td>
                <td className="px-4 py-2.5">{e.supplier?.name}</td>
                <td className="px-4 py-2.5 inv-mono">
                  {e.quantityReceived} {e.ingredient?.purchaseUnit?.abbreviation}
                </td>
                <td className="px-4 py-2.5 inv-mono">₹{Number(e.purchasePrice).toFixed(2)}</td>
                <td className="px-4 py-2.5 inv-mono">₹{Number(e.totalAmount).toLocaleString("en-IN")}</td>
                <td className="px-4 py-2.5">{e.invoiceNumber || "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} title="Record Goods Received" onClose={() => setModalOpen(false)} wide>
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          <Field label="Link to Purchase Order (optional)">
            <Select
              value={form.purchaseOrderId}
              onChange={(e) => setForm({ ...form, purchaseOrderId: e.target.value })}
            >
              <option value="">None — direct entry</option>
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} — {po.supplier?.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Supplier">
            <Select
              required
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            >
              <option value="">Select…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="col-span-2">
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
          </div>
          <Field
            label={`Quantity Received${
              selectedIngredient ? ` (in ${selectedIngredient.purchaseUnit?.name})` : ""
            }`}
          >
            <Input
              type="number"
              step="0.0001"
              required
              value={form.quantityReceived}
              onChange={(e) => setForm({ ...form, quantityReceived: e.target.value })}
            />
          </Field>
          <Field label="Purchase Price (per purchase unit)">
            <Input
              type="number"
              step="0.01"
              required
              value={form.purchasePrice}
              onChange={(e) => setForm({ ...form, purchasePrice: e.target.value })}
            />
          </Field>
          <Field label="GST %">
            <Input
              type="number"
              step="0.01"
              value={form.gstPercent}
              onChange={(e) => setForm({ ...form, gstPercent: e.target.value })}
            />
          </Field>
          <Field label="Discount (₹)">
            <Input
              type="number"
              step="0.01"
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: e.target.value })}
            />
          </Field>
          <Field label="Invoice Number">
            <Input
              value={form.invoiceNumber}
              onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
            />
          </Field>
          <Field label="Batch Number">
            <Input
              value={form.batchNumber}
              onChange={(e) => setForm({ ...form, batchNumber: e.target.value })}
            />
          </Field>
          <Field label="Expiry Date (optional)">
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </Field>

          {selectedIngredient && form.quantityReceived && (
            <div className="col-span-2 rounded-md bg-[var(--inv-pine-tint)] px-4 py-2.5 text-sm text-[var(--inv-pine-dark)]">
              This adds{" "}
              <strong>
                {(Number(form.quantityReceived) * Number(selectedIngredient.conversionRatio)).toFixed(2)}{" "}
                {selectedIngredient.consumptionUnit?.abbreviation}
              </strong>{" "}
              to stock ({selectedIngredient.purchaseUnit?.name} → {selectedIngredient.consumptionUnit?.name}{" "}
              conversion applied automatically).
            </div>
          )}

          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Recording…" : "Record & Update Stock"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PurchaseEntriesPage;