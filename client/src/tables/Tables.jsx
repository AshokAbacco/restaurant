// src/pos/pages/Tables.jsx
import { useEffect, useState } from "react";
import {
  getFloors,
  createFloor,
  updateFloor,
  deleteFloor,
  getTablesByFloor,
  createTable,
  updateTable,
  deleteTable,
} from "./api/tablesManagementApi";
import { Plus } from "lucide-react";
import FloorTabs from "./components/FloorTabs";
import TableCard from "./components/TableCard";
import AddFloorModal from "./components/AddFloorModal";
import AddTableModal from "./components/AddTableModal";

function Button({ variant = "primary", className = "", disabled, children, ...props }) {
  const variants = {
    primary: "bg-[#1C3044] text-white hover:bg-[#27435B] shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
  };
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default function Tables() {
  const [floors, setFloors] = useState([]);
  const [selectedFloorId, setSelectedFloorId] = useState(null);
  const [tables, setTables] = useState([]);

  const [floorsLoading, setFloorsLoading] = useState(true);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [error, setError] = useState(null);

  const [showFloorModal, setShowFloorModal] = useState(false);
  const [editingFloor, setEditingFloor] = useState(null);
  const [confirmDeleteFloor, setConfirmDeleteFloor] = useState(null);

  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [confirmDeleteTableId, setConfirmDeleteTableId] = useState(null);
  const [deletingTableId, setDeletingTableId] = useState(null);

  // Load floors once on mount; select the first floor by default.
  useEffect(() => {
    loadFloors();
  }, []);

  async function loadFloors(preserveSelection = false) {
    setFloorsLoading(true);
    setError(null);
    try {
      const data = await getFloors();
      setFloors(data);
      if (!preserveSelection && data.length > 0) setSelectedFloorId(data[0].id);
      if (data.length === 0) setSelectedFloorId(null);
    } catch (err) {
      setError(err.message || "Couldn't load floors.");
    } finally {
      setFloorsLoading(false);
    }
  }

  // Re-fetch tables whenever the selected floor changes.
  useEffect(() => {
    if (!selectedFloorId) {
      setTables([]);
      return;
    }
    loadTables(selectedFloorId);
  }, [selectedFloorId]);

  async function loadTables(floorId) {
    setTablesLoading(true);
    setError(null);
    try {
      const data = await getTablesByFloor(floorId);
      setTables(data);
    } catch (err) {
      setError(err.message || "Couldn't load tables.");
    } finally {
      setTablesLoading(false);
    }
  }

  // ---- Floors ----

  function openAddFloor() {
    setEditingFloor(null);
    setShowFloorModal(true);
  }

  function openEditFloor(floor) {
    setEditingFloor(floor);
    setShowFloorModal(true);
  }

  async function handleSaveFloor(payload, editingId) {
    if (editingId) {
      const updated = await updateFloor(editingId, payload);
      setFloors((prev) => prev.map((f) => (f.id === editingId ? updated : f)));
      return;
    }
    // Adds the tab without disturbing whichever floor is currently selected.
    const created = await createFloor(payload);
    setFloors((prev) => [...prev, created]);
  }

  async function handleDeleteFloor(id) {
    try {
      await deleteFloor(id);
      const remaining = floors.filter((f) => f.id !== id);
      setFloors(remaining);
      if (selectedFloorId === id) {
        setSelectedFloorId(remaining[0]?.id || null);
      }
    } catch (err) {
      setError(err.message || "Couldn't delete the floor.");
    } finally {
      setConfirmDeleteFloor(null);
    }
  }

  // ---- Tables ----

  function openAddTable() {
    setEditingTable(null);
    setShowTableModal(true);
  }

  function openEditTable(table) {
    setEditingTable(table);
    setShowTableModal(true);
  }

  async function handleSaveTable(payload, editingId) {
    if (editingId) {
      const updated = await updateTable(editingId, payload);
      setTables((prev) => prev.map((t) => (t.id === editingId ? updated : t)));
      return;
    }

    const created = await createTable(payload);
    // Only splice it into the visible grid if it belongs to the floor
    // currently on screen — otherwise it'll simply be there when that
    // floor's tab is selected, since it's already persisted.
    if (created.floorId === selectedFloorId) {
      setTables((prev) => [...prev, created]);
    }
  }

  async function handleDeleteTable(id) {
    setDeletingTableId(id);
    try {
      await deleteTable(id);
      setTables((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err.message || "Couldn't delete the table.");
    } finally {
      setDeletingTableId(null);
      setConfirmDeleteTableId(null);
    }
  }

  const hasFloors = floors.length > 0;

  return (
    <div className="mx-auto max-w-8xl px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[30px] font-bold text-[#1C3044]">Tables</h1>
          <p className="text-sm text-slate-400">Manage floors and tables across your restaurant.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openAddFloor}>
            <Plus className="h-4 w-4" />
            Add Floor
          </Button>
          <Button variant="primary" onClick={openAddTable} disabled={!hasFloors}>
            <Plus className="h-4 w-4" />
            Add Table
          </Button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      {floorsLoading ? (
        <div className="py-16 text-center text-sm text-slate-400">Loading floors…</div>
      ) : !hasFloors ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-sm font-medium text-slate-500">No floors available. Please add a floor first.</p>
          <Button className="mt-4" onClick={openAddFloor}>
            <Plus className="h-4 w-4" />
            Add Floor
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <FloorTabs
              floors={floors}
              selectedFloorId={selectedFloorId}
              onSelect={setSelectedFloorId}
              onEditFloor={openEditFloor}
              onDeleteFloor={(floor) => setConfirmDeleteFloor(floor)}
            />
          </div>

          {confirmDeleteFloor && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 px-3 py-2">
              <span className="text-sm text-red-600">
                Delete "{confirmDeleteFloor.name}"? Its tables will become unassigned, not deleted.
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteFloor(null)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteFloor(confirmDeleteFloor.id)}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          <div className="mt-5">
            {tablesLoading ? (
              <div className="py-12 text-center text-sm text-slate-400">Loading tables…</div>
            ) : tables.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                <p className="text-sm font-medium text-slate-500">No tables on this floor yet.</p>
                <Button className="mt-4" onClick={openAddTable}>
                  <Plus className="h-4 w-4" />
                  Add Table
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    onEdit={openEditTable}
                    onDelete={handleDeleteTable}
                    deleting={deletingTableId === table.id}
                    confirmingDelete={confirmDeleteTableId === table.id}
                    onRequestDelete={setConfirmDeleteTableId}
                    onCancelDelete={() => setConfirmDeleteTableId(null)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AddFloorModal
        open={showFloorModal}
        onClose={() => setShowFloorModal(false)}
        editingFloor={editingFloor}
        onSave={handleSaveFloor}
      />

      <AddTableModal
        open={showTableModal}
        onClose={() => setShowTableModal(false)}
        floors={floors}
        defaultFloorId={selectedFloorId}
        editingTable={editingTable}
        onSave={handleSaveTable}
      />
    </div>
  );
}