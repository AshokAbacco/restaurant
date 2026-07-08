// client/src/inventory/pages/RecipesPage.jsx
import { useEffect, useState } from "react";
import * as inv from "../api/inventoryApi";
import { PageHeader, Card, Table, EmptyState, Button, Select, Input, ErrorBanner } from "../components/ui";

const RecipesPage = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [menuItemId, setMenuItemId] = useState("");
  const [recipe, setRecipe] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [newIngredientId, setNewIngredientId] = useState("");
  const [newQty, setNewQty] = useState("");

  useEffect(() => {
    inv.getMenuItems()
      .then((items) => setMenuItems(Array.isArray(items) ? items : []))
      .catch(() => setMenuItems([]));
    inv.getIngredients().then(setIngredients);
  }, []);

  const loadRecipe = async (id) => {
    setLoading(true);
    setError("");
    try {
      setRecipe(await inv.getRecipe(id));
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load recipe");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (menuItemId) loadRecipe(menuItemId);
    else setRecipe([]);
  }, [menuItemId]);

  const handleAddLine = async (e) => {
    e.preventDefault();
    if (!newIngredientId || !newQty) return;
    setSaving(true);
    setError("");
    try {
      await inv.upsertRecipeIngredient(menuItemId, newIngredientId, Number(newQty));
      setNewIngredientId("");
      setNewQty("");
      loadRecipe(menuItemId);
    } catch (e2) {
      setError(e2?.response?.data?.message || "Failed to save recipe line");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (ingredientId) => {
    try {
      await inv.removeRecipeIngredient(menuItemId, ingredientId);
      loadRecipe(menuItemId);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to remove line");
    }
  };

  return (
    <div>
      <PageHeader
        title="Recipes"
        subtitle="Link a menu item to the ingredients it consumes — this drives automatic stock deduction on sale."
      />
      <ErrorBanner message={error} />

      <Card className="p-5 mb-6">
        <label className="block max-w-sm">
          <span className="block text-xs font-medium text-[var(--inv-steel)] mb-1">Menu Item</span>
          <Select value={menuItemId} onChange={(e) => setMenuItemId(e.target.value)}>
            <option value="">Select a menu item…</option>
            {menuItems.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </label>
        {menuItems.length === 0 && (
          <p className="text-xs text-[var(--inv-steel)] mt-2">
            No menu items found — create one in Menu Management first.
          </p>
        )}
      </Card>

      {menuItemId && (
        <Card>
          {loading ? (
            <p className="text-sm text-[var(--inv-steel)] p-5">Loading…</p>
          ) : (
            <>
              {recipe.length === 0 ? (
                <EmptyState
                  title="No recipe defined yet"
                  hint="Add ingredients below so this item deducts stock correctly when sold."
                />
              ) : (
                <Table columns={["Ingredient", "Quantity per sale", ""]}>
                  {recipe.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-2.5">{line.ingredient?.name}</td>
                      <td className="px-4 py-2.5 inv-mono">
                        {line.quantity} {line.ingredient?.consumptionUnit?.abbreviation}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleRemove(line.ingredientId)}
                          className="text-sm text-[var(--inv-rust)] hover:underline"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </Table>
              )}
              <form
                onSubmit={handleAddLine}
                className="flex items-end gap-2 p-4 border-t border-[var(--inv-line)]"
              >
                <div className="flex-1">
                  <span className="block text-xs font-medium text-[var(--inv-steel)] mb-1">
                    Add ingredient
                  </span>
                  <Select value={newIngredientId} onChange={(e) => setNewIngredientId(e.target.value)}>
                    <option value="">Select…</option>
                    {ingredients.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-40">
                  <span className="block text-xs font-medium text-[var(--inv-steel)] mb-1">Quantity</span>
                  <Input
                    type="number"
                    step="0.0001"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Adding…" : "Add"}
                </Button>
              </form>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default RecipesPage;