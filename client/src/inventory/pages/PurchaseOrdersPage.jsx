// client/src/inventory/pages/PurchaseOrdersPage.jsx
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

const STATUS_TONE = { DRAFT: "neutral", ORDERED: "warn", RECEIVED: "good", CANCELLED: "bad" };
const STATUSES = ["DRAFT", "ORDERED", "RECEIVED", "CANCELLED"];

const emptyItem = { ingredientId: "", quantity: "", unitPrice: "", taxPercent: 0 };

const PurchaseOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDelivery, setExpectedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [saving, setSaving] = useState(false);

  const [detailOrder, setDetailOrder] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setOrders(await inv.getPurchaseOrders());
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    inv.getSuppliers().then(setSuppliers);
    inv.getIngredients().then(setIngredients);
  }, []);

  const openCreate = () => {
    setSupplierId("");
    setExpectedDelivery("");
    setNotes("");
    setItems([{ ...emptyItem }]);
    setModalOpen(true);
  };

  const updateItem = (idx, patch) =>
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await inv.createPurchaseOrder({
        supplierId,
        expectedDelivery: expectedDelivery || undefined,
        notes,
        items: items.map((it) => ({
          ingredientId: it.ingredientId,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          taxPercent: Number(it.taxPercent || 0),
        })),
      });
      setModalOpen(false);
      load();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (order, status) => {
    try {
      await inv.updatePurchaseOrderStatus(order.id, status);
      load();
      if (detailOrder?.id === order.id) {
        setDetailOrder(await inv.getPurchaseOrder(order.id));
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to update status");
    }
  };

  const openDetail = async (order) => {
    try {
      setDetailOrder(await inv.getPurchaseOrder(order.id));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load order");
    }
  };

  const lineTotal = (it) => {
    const sub = Number(it.quantity || 0) * Number(it.unitPrice || 0);
    return sub + sub * (Number(it.taxPercent || 0) / 100);
  };
  const orderTotal = items.reduce((sum, it) => sum + lineTotal(it), 0);

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="What you've ordered from suppliers, and its status."
        action={<Button onClick={openCreate}>+ New Purchase Order</Button>}
      />
      <ErrorBanner message={error} />

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
        ) : orders.length === 0 ? (
          <EmptyState title="No purchase orders yet" hint="Create one to start ordering from a supplier." />
        ) : (
          <Table columns={["PO Number", "Supplier", "Status", "Total", "Expected", ""]}>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-2.5 inv-mono">{o.poNumber}</td>
                <td className="px-4 py-2.5">{o.supplier?.name}</td>
                <td className="px-4 py-2.5">
                  <TicketPill tone={STATUS_TONE[o.status]}>{o.status}</TicketPill>
                </td>
                <td className="px-4 py-2.5 inv-mono">₹{Number(o.totalAmount).toLocaleString("en-IN")}</td>
                <td className="px-4 py-2.5">
                  {o.expectedDelivery ? new Date(o.expectedDelivery).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => openDetail(o)}
                    className="text-sm text-[var(--inv-pine)] hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={modalOpen} title="New Purchase Order" onClose={() => setModalOpen(false)} wide>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Supplier">
              <Select required value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                <option value="">Select…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Expected Delivery">
              <Input
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
              />
            </Field>
          </div>

          <div>
            <p className="text-xs font-medium text-[var(--inv-steel)] mb-2">Line items</p>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <Select
                      required
                      value={it.ingredientId}
                      onChange={(e) => updateItem(idx, { ingredientId: e.target.value })}
                    >
                      <option value="">Ingredient…</option>
                      {ingredients.map((ig) => (
                        <option key={ig.id} value={ig.id}>
                          {ig.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.0001"
                      placeholder="Qty"
                      required
                      value={it.quantity}
                      onChange={(e) => updateItem(idx, { quantity: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Unit price"
                      required
                      value={it.unitPrice}
                      onChange={(e) => updateItem(idx, { unitPrice: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Tax %"
                      value={it.taxPercent}
                      onChange={(e) => updateItem(idx, { taxPercent: e.target.value })}
                    />
                  </div>
                  <div className="col-span-1 inv-mono text-xs text-right">
                    ₹{lineTotal(it).toFixed(2)}
                  </div>
                  <div className="col-span-1 text-right">
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-[var(--inv-rust)] text-sm"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" className="mt-2" onClick={addItem}>
              + Add line
            </Button>
          </div>

          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm">
              Total: <span className="inv-mono font-semibold">₹{orderTotal.toFixed(2)}</span>
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create Order"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!detailOrder}
        title={`Purchase Order ${detailOrder?.poNumber || ""}`}
        onClose={() => setDetailOrder(null)}
        wide
      >
        {detailOrder && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--inv-steel)]">{detailOrder.supplier?.name}</p>
                <TicketPill tone={STATUS_TONE[detailOrder.status]}>{detailOrder.status}</TicketPill>
              </div>
              {detailOrder.status !== "CANCELLED" && detailOrder.status !== "RECEIVED" && (
                <div className="flex gap-2">
                  {detailOrder.status === "DRAFT" && (
                    <Button variant="secondary" onClick={() => handleStatusChange(detailOrder, "ORDERED")}>
                      Mark Ordered
                    </Button>
                  )}
                  <Button variant="danger" onClick={() => handleStatusChange(detailOrder, "CANCELLED")}>
                    Cancel Order
                  </Button>
                </div>
              )}
            </div>
            <Table columns={["Ingredient", "Qty", "Unit Price", "Tax %", "Total"]}>
              {detailOrder.items?.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-2.5">{it.ingredient?.name}</td>
                  <td className="px-4 py-2.5 inv-mono">{it.quantity}</td>
                  <td className="px-4 py-2.5 inv-mono">₹{Number(it.unitPrice).toFixed(2)}</td>
                  <td className="px-4 py-2.5 inv-mono">{it.taxPercent}%</td>
                  <td className="px-4 py-2.5 inv-mono">₹{Number(it.totalAmount).toFixed(2)}</td>
                </tr>
              ))}
            </Table>
            <p className="text-right text-sm">
              Total:{" "}
              <span className="inv-mono font-semibold">
                ₹{Number(detailOrder.totalAmount).toLocaleString("en-IN")}
              </span>
            </p>
            {detailOrder.status === "ORDERED" && (
              <p className="text-xs text-[var(--inv-steel)] bg-[var(--inv-steel-light)] rounded-md px-3 py-2">
                Once goods arrive, record it under <strong>Purchase Entries</strong> and link this PO —
                that's what actually moves stock and marks this order Received.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PurchaseOrdersPage;