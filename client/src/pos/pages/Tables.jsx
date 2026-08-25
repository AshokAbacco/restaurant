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
  getWaiters,
  assignTables,
  assignFloorToWaiter,
  assignAllTablesToWaiter,
  unassignTable,
  createReservation,
  seatReservation,
  cancelReservation,
} from "./api/tablesManagementApi";
import { Plus, UserCog, X, CalendarClock } from "lucide-react";
import FloorTabs from "./components/FloorTabs";
import TableCard from "./components/TableCard";
import AddFloorModal from "./components/AddFloorModal";
import AddTableModal from "./components/AddTableModal";
import AssignWaiterModal from "./components/AssignWaiterModal";
import ReserveTableModal from "./components/ReserveTableModal";
import MyTablesView from "./components/MyTablesView";
import { useAuth } from "../auth/AuthContext";

function Button({
  variant = "primary",
  className = "",
  disabled,
  children,
  ...props
}) {
  const variants = {
    primary:
      "bg-[#3FA34D] text-white hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] shadow-sm",
    secondary:
      "bg-white dark:bg-[#171C17] text-[#6B7280] dark:text-[#9CA8A0] border border-[#E7EAE1] dark:border-[#262B24] hover:bg-[#F3F5EE] dark:hover:bg-white/10",
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
  const { user } = useAuth();

  // Waiters get a completely different, read-only screen — their own
  // assigned tables with live order/payment status. Nothing below this
  // point (management state, assignment, CRUD) is ever reachable for them,
  // since the backend also enforces it independently.
  if (user?.role === "WAITER") {
    return <MyTablesView />;
  }

  const canAssign = ["OWNER", "ADMIN", "MANAGER"].includes(user?.role);

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

  // ---- Waiter assignment state ----
  const [assignMode, setAssignMode] = useState(false);
  const [selectedTableIds, setSelectedTableIds] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [waitersLoading, setWaitersLoading] = useState(false);
  const [assignModalScope, setAssignModalScope] = useState(null); // "selected" | "floor" | "all"
  const [unassigningTableId, setUnassigningTableId] = useState(null);

  // ---- Reservation state (Phase 1.3) ----
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reservingTableId, setReservingTableId] = useState(null); // prefilled when opened from a specific card

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

  // ---- Waiter assignment ----

  async function loadWaiters() {
    setWaitersLoading(true);
    try {
      setWaiters(await getWaiters());
    } catch (err) {
      setError(err.message || "Couldn't load waiters.");
    } finally {
      setWaitersLoading(false);
    }
  }

  function toggleAssignMode() {
    setAssignMode((prev) => !prev);
    setSelectedTableIds([]);
  }

  function toggleSelectTable(id) {
    setSelectedTableIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  function openAssignModal(scope) {
    setAssignModalScope(scope);
    loadWaiters();
  }

  async function handleConfirmAssign(waiterId) {
    if (assignModalScope === "selected") {
      const updated = await assignTables(selectedTableIds, waiterId);
      setTables((prev) => {
        const byId = Object.fromEntries(updated.map((t) => [t.id, t]));
        return prev.map((t) => byId[t.id] || t);
      });
      setSelectedTableIds([]);
      setAssignMode(false);
    } else if (assignModalScope === "floor") {
      await assignFloorToWaiter(selectedFloorId, waiterId);
      await loadTables(selectedFloorId);
    } else if (assignModalScope === "all") {
      await assignAllTablesToWaiter(waiterId);
      await loadTables(selectedFloorId);
    }
  }

  async function handleUnassign(tableId) {
    setUnassigningTableId(tableId);
    try {
      const updated = await unassignTable(tableId);
      setTables((prev) => prev.map((t) => (t.id === tableId ? updated : t)));
    } catch (err) {
      setError(err.message || "Couldn't unassign the table.");
    } finally {
      setUnassigningTableId(null);
    }
  }

  // ---- Reservations (Phase 1.3) ----

  function openReserveModal(table) {
    setReservingTableId(table?.id || null);
    setShowReserveModal(true);
  }

  async function handleSaveReservation(payload) {
    await createReservation(payload);
    // Re-fetch rather than patch the single table in place — the new
    // reservation may become the table's "next upcoming" one, but
    // computing that client-side would duplicate the backend's own
    // earliest-first logic. Simplest to just ask again.
    if (selectedFloorId) await loadTables(selectedFloorId);
  }

  async function handleSeatReservation(reservationId) {
    try {
      await seatReservation(reservationId);
      if (selectedFloorId) await loadTables(selectedFloorId);
    } catch (err) {
      setError(err.message || "Couldn't seat that reservation.");
    }
  }

  async function handleCancelReservation(reservationId) {
    try {
      await cancelReservation(reservationId);
      if (selectedFloorId) await loadTables(selectedFloorId);
    } catch (err) {
      setError(err.message || "Couldn't cancel that reservation.");
    }
  }

  const hasFloors = floors.length > 0;
  const selectedFloor = floors.find((f) => f.id === selectedFloorId);

  return (
    <div className="min-h-full bg-[#F3F5EE] dark:bg-[#12160F]">
      <div className="mx-auto max-w-8xl px-4 py-6 sm:px-6">
        {/* Page header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[30px] font-bold text-[#1F2937] dark:text-white">
              Tables
            </h1>
            <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">
              Manage floors and tables across your restaurant.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canAssign && (
              <Button
                variant={assignMode ? "primary" : "secondary"}
                onClick={toggleAssignMode}
                disabled={!hasFloors}
              >
                {assignMode ? (
                  <X className="h-4 w-4" />
                ) : (
                  <UserCog className="h-4 w-4" />
                )}
                {assignMode ? "Cancel Assign" : "Assign Waiter"}
              </Button>
            )}
            {!assignMode && (
              <>
                <Button variant="secondary" onClick={openAddFloor}>
                  <Plus className="h-4 w-4" />
                  Add Floor
                </Button>
                <Button
                  variant="primary"
                  onClick={openAddTable}
                  disabled={!hasFloors}
                >
                  <Plus className="h-4 w-4" />
                  Add Table
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => openReserveModal(null)}
                  disabled={!hasFloors}
                >
                  <CalendarClock className="h-4 w-4" />
                  Table Reservation
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Assign-mode toolbar: pick a scope once tables are selected, or assign
          the whole floor / every table in one click without selecting anything. */}
        {assignMode && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#C9E7CF] dark:border-[#43B75A]/30 bg-[#EAF6EC]/60 dark:bg-[#43B75A]/10 px-4 py-3">
            <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
              {selectedTableIds.length > 0
                ? `${selectedTableIds.length} table${selectedTableIds.length === 1 ? "" : "s"} selected`
                : "Tap tables to select them, or assign a whole floor / everything below."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                className="!px-3 !py-1.5 !text-xs"
                disabled={selectedTableIds.length === 0}
                onClick={() => openAssignModal("selected")}
              >
                Assign Selected
              </Button>
              <Button
                variant="secondary"
                className="!px-3 !py-1.5 !text-xs"
                disabled={!selectedFloorId}
                onClick={() => openAssignModal("floor")}
              >
                Assign Whole Floor
                {selectedFloor ? ` (${selectedFloor.name})` : ""}
              </Button>
              <Button
                variant="secondary"
                className="!px-3 !py-1.5 !text-xs"
                onClick={() => openAssignModal("all")}
              >
                Assign All Tables
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-[#EF5350] dark:text-red-400">
            {error}
          </div>
        )}

        {floorsLoading ? (
          <div className="py-16 text-center text-sm text-[#9CA3AF] dark:text-[#6B7280]">
            Loading floors…
          </div>
        ) : !hasFloors ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E7EAE1] dark:border-[#262B24] py-16 text-center">
            <p className="text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0]">
              No floors available. Please add a floor first.
            </p>
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
                onEditFloor={assignMode ? undefined : openEditFloor}
                onDeleteFloor={
                  assignMode
                    ? undefined
                    : (floor) => setConfirmDeleteFloor(floor)
                }
              />
            </div>

            {confirmDeleteFloor && (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-red-50 dark:bg-red-500/10 px-3 py-2">
                <span className="text-sm text-[#EF5350] dark:text-red-400">
                  Delete "{confirmDeleteFloor.name}"? Its tables will become
                  unassigned, not deleted.
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmDeleteFloor(null)}
                    className="text-xs font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:text-[#1F2937] dark:hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteFloor(confirmDeleteFloor.id)}
                    className="text-xs font-semibold text-[#EF5350] dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5">
              {tablesLoading ? (
                <div className="py-12 text-center text-sm text-[#9CA3AF] dark:text-[#6B7280]">
                  Loading tables…
                </div>
              ) : tables.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E7EAE1] dark:border-[#262B24] py-16 text-center">
                  <p className="text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0]">
                    No tables on this floor yet.
                  </p>
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
                      assignMode={assignMode}
                      selected={selectedTableIds.includes(table.id)}
                      onToggleSelect={toggleSelectTable}
                      onUnassign={canAssign ? handleUnassign : undefined}
                      unassigning={unassigningTableId === table.id}
                      onReserve={openReserveModal}
                      onSeatReservation={handleSeatReservation}
                      onCancelReservation={handleCancelReservation}
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

        <AssignWaiterModal
          open={!!assignModalScope}
          onClose={() => setAssignModalScope(null)}
          scope={assignModalScope}
          selectedCount={selectedTableIds.length}
          floorName={selectedFloor?.name}
          waiters={waiters}
          waitersLoading={waitersLoading}
          onConfirm={handleConfirmAssign}
        />

        <ReserveTableModal
          open={showReserveModal}
          onClose={() => setShowReserveModal(false)}
          tables={tables}
          defaultTableId={reservingTableId}
          onSave={handleSaveReservation}
        />
      </div>
    </div>
  );
}