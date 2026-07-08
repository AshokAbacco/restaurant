// client/src/inventory/pages/IngredientsPage.jsx
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
  Select,
  TicketPill,
  ErrorBanner,
} from "../components/ui";

const emptyForm = {
  name: "",
  itemCode: "",
  barcode: "",
  description: "",
  categoryId: "",
  purchaseUnitId: "",
  consumptionUnitId: "",
  conversionRatio: 1,
  minimumStockLevel: 0,
};

const stockStatus = (ingredient) => {
  const qty = Number(ingredient.inventoryStock?.quantityOnHand ?? 0);
  const min = Number(ingredient.minimumStockLevel ?? 0);
  if (qty <= 0) return { label: "Out of Stock", tone: "bad", rowFlag: "row-flag-bad" };
  if (qty <= min) return { label: "Low Stock", tone: "warn", rowFlag: "row-flag-warn" };
  return { label: "In Stock", tone: "good", rowFlag: "" };
};

const IngredientsPage = () => {
  const [ingredients, setIngredients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState(""); // "", "lowStock", "outOfStock"

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadLookups = async () => {
    const [cats, us] = await Promise.all([inv.getCategories(), inv.getUnits()]);
    setCategories(cats);
    setUnits(us);
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.categoryId = categoryFilter;
      if (stockFilter) params[stockFilter] = "true";
      setIngredients(await inv.getIngredients(params));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load ingredients");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search typing
    return () => clearTimeout(t);
  }, [search, categoryFilter, stockFilter]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (i) => {
    setEditing(i);
    setForm({
      ...emptyForm,
      ...i,
      categoryId: i.categoryId,
      purchaseUnitId: i.purchaseUnitId,
      consumptionUnitId: i.consumptionUnitId,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editing) await inv.updateIngredient(editing.id, form);
      else await inv.createIngredient(form);
      setModalOpen(false);
      load();
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to save ingredient");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (i) => {
    if (!confirm(`Delete "${i.name}"?`)) return;
    try {
      await inv.deleteIngredient(i.id);
      load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to delete — it may have stock or movement history");
    }
  };

  return (
    <div>
      <PageHeader
        title="Ingredients"
        subtitle="Everything the kitchen stocks and consumes."
        action={<Button onClick={openCreate}>+ Add Ingredient</Button>}
      />
      <ErrorBanner message={error} />

      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder="Search name, code, or barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button
          variant={stockFilter === "lowStock" ? "primary" : "secondary"}
          onClick={() => setStockFilter(stockFilter === "lowStock" ? "" : "lowStock")}
        >
          Low Stock
        </Button>
        <Button
          variant={stockFilter === "outOfStock" ? "primary" : "secondary"}
          onClick={() => setStockFilter(stockFilter === "outOfStock" ? "" : "outOfStock")}
        >
          Out of Stock
        </Button>
      </div>

      <Card>
        {loading ? (
          <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
        ) : ingredients.length === 0 ? (
          <EmptyState title="No ingredients match" hint="Try clearing filters, or add a new ingredient." />
        ) : (
          <Table columns={["Name", "Code", "Category", "On Hand", "Avg Cost", "Status", ""]}>
            {ingredients.map((i) => {
              const status = stockStatus(i);
              return (
                <tr key={i.id} className={status.rowFlag}>
                  <td className="px-4 py-2.5 font-medium">{i.name}</td>
                  <td className="px-4 py-2.5 inv-mono text-xs">{i.itemCode}</td>
                  <td className="px-4 py-2.5">{i.category?.name}</td>
                  <td className="px-4 py-2.5 inv-mono">
                    {Number(i.inventoryStock?.quantityOnHand ?? 0)} {i.consumptionUnit?.abbreviation}
                  </td>
                  <td className="px-4 py-2.5 inv-mono">
                    ₹{Number(i.inventoryStock?.averageCost ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2.5">
                    <TicketPill tone={status.tone}>{status.label}</TicketPill>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(i)}
                      className="text-sm text-[var(--inv-pine)] hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(i)}
                      className="text-sm text-[var(--inv-rust)] hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? "Edit Ingredient" : "Add Ingredient"}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form onSubmit={handleSave} className="grid grid-cols-2 gap-4">
          <Field label="Name">
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Item Code">
            <Input
              required
              value={form.itemCode}
              onChange={(e) => setForm({ ...form, itemCode: e.target.value })}
            />
          </Field>
          <Field label="Barcode">
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
          </Field>
          <Field label="Category">
            <Select
              required
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            >
              <option value="">Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Purchase Unit" hint="Unit you buy it in">
            <Select
              required
              value={form.purchaseUnitId}
              onChange={(e) => setForm({ ...form, purchaseUnitId: e.target.value })}
            >
              <option value="">Select…</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Consumption Unit" hint="Unit stock is tracked in">
            <Select
              required
              value={form.consumptionUnitId}
              onChange={(e) => setForm({ ...form, consumptionUnitId: e.target.value })}
            >
              <option value="">Select…</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Conversion Ratio" hint="1 purchase unit = ___ consumption units">
            <Input
              type="number"
              step="0.0001"
              value={form.conversionRatio}
              onChange={(e) => setForm({ ...form, conversionRatio: e.target.value })}
            />
          </Field>
          <Field label="Minimum Stock Level" hint="Alert when stock falls below this (consumption units)">
            <Input
              type="number"
              step="0.0001"
              value={form.minimumStockLevel}
              onChange={(e) => setForm({ ...form, minimumStockLevel: e.target.value })}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
          </div>

          {editing && (
            <div className="col-span-2 rounded-md bg-[var(--inv-steel-light)] px-4 py-3 text-sm">
              <p className="font-medium mb-1">Current stock (read-only)</p>
              <p className="text-[var(--inv-steel)]">
                {Number(editing.inventoryStock?.quantityOnHand ?? 0)}{" "}
                {editing.consumptionUnit?.abbreviation} on hand · avg cost ₹
                {Number(editing.inventoryStock?.averageCost ?? 0).toFixed(2)} — changes only through
                purchase entries, adjustments, or sales.
              </p>
            </div>
          )}

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
    </div>
  );
};

export default IngredientsPage;