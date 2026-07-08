// client/src/inventory/pages/CategoriesPage.jsx
import * as inv from "../api/inventoryApi";
import SimpleCrudTable from "../components/SimpleCrudTable";
import { TicketPill } from "../components/ui";

const CategoriesPage = () => (
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

export default CategoriesPage;