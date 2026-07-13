// client/src/inventory/pages/CatalogSimplePages.jsx
// Categories and Units are both flat, single-table lookups with identical
// list + create/edit/delete behavior (same SimpleCrudTable shape, just
// different columns/fields) — combined into one file instead of two
// nearly-identical ~20-line wrapper files. Both are still routed and
// behave exactly as before; only the file organization changed.
import * as inv from "../api/inventoryApi";
import SimpleCrudTable from "../components/SimpleCrudTable";
import { TicketPill } from "../components/ui";

export const CategoriesPage = () => (
  <SimpleCrudTable
    title="Categories"
    subtitle="Groupings like Vegetables, Meat, Dairy, Oil, Packaging…"
    columns={["Name", "Description", "Status"]}
    fields={[
      { name: "name", label: "Name", required: true },
      { name: "description", label: "Description" },
    ]}
    api={{
      list: inv.getCategories,
      create: inv.createCategory,
      update: inv.updateCategory,
      remove: inv.deleteCategory,
    }}
    renderRow={(c) => [
      c.name,
      c.description || "—",
      <TicketPill tone={c.isEnabled ? "good" : "neutral"}>
        {c.isEnabled ? "Enabled" : "Disabled"}
      </TicketPill>,
    ]}
    emptyHint="Categories group ingredients for filtering and reporting."
  />
);

export const UnitsPage = () => (
  <SimpleCrudTable
    title="Units"
    subtitle="Measurement units used for purchasing and consumption (Kg, ml, Piece, Bottle…)."
    columns={["Name", "Abbreviation"]}
    fields={[
      { name: "name", label: "Name", required: true },
      { name: "abbreviation", label: "Abbreviation" },
    ]}
    api={{
      list: inv.getUnits,
      create: inv.createUnit,
      update: inv.updateUnit,
      remove: inv.deleteUnit,
    }}
    renderRow={(u) => [u.name, u.abbreviation || "—"]}
    emptyHint='Add units like "Kg", "ml", or "Piece" before creating ingredients.'
  />
);
