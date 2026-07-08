// client/src/inventory/pages/UnitsPage.jsx
import * as inv from "../api/inventoryApi";
import SimpleCrudTable from "../components/SimpleCrudTable";

const UnitsPage = () => (
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

export default UnitsPage;