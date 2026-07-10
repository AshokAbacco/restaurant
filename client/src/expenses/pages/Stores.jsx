// client/src/expenses/pages/Stores.jsx
import { useEffect, useState } from "react";
import expenseService from "../services/expenseService";
import StoreModal from "../components/StoreModal";
import { FiPlus, FiEdit2, FiTrash2, FiHome, FiInbox, FiMapPin, FiPhone } from "react-icons/fi";
import { ui } from "../expenseTheme";
import { ErrorBanner, SkeletonGrid, EmptyState } from "../ExpenseUI";

const Stores = () => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await expenseService.getStores();
      setStores(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (payload) => {
    try {
      setSaving(true);
      if (selectedStore) {
        await expenseService.updateStore(selectedStore.id, payload);
      } else {
        await expenseService.createStore(payload);
      }
      setModalOpen(false);
      setSelectedStore(null);
      loadStores();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (store) => {
    setSelectedStore(store);
    setModalOpen(true);
  };

  const handleDelete = async (store) => {
    if (!window.confirm(`Remove "${store.name}"? Expenses already using it will keep the store name.`)) return;

    try {
      await expenseService.deleteStore(store.id);
      loadStores();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className={`text-sm ${ui.muted}`}>
          Stores/branches show up as the "Store" choice when adding an expense.
        </p>

        <button
          onClick={() => {
            setSelectedStore(null);
            setModalOpen(true);
          }}
          className={`${ui.btnPrimary} shrink-0`}
        >
          <FiPlus /> Add Store
        </button>
      </div>

      {error && <div className="mb-6"><ErrorBanner>{error}</ErrorBanner></div>}

      {loading ? (
        <SkeletonGrid count={3} className="h-32" />
      ) : stores.length === 0 ? (
        <EmptyState
          icon={<FiInbox className="mx-auto" />}
          title="No stores yet"
          subtitle='Add your first branch, like "Main Store."'
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <div key={store.id} className={`${ui.card} p-5 flex flex-col justify-between`}>
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 flex items-center justify-center text-[#3FA34D] dark:text-[#43B75A]">
                    <FiHome />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      store.isActive ? ui.badgeGreen : ui.badgeGray
                    }`}
                  >
                    {store.isActive ? "Active" : "Disabled"}
                  </span>
                </div>

                <h3 className={`mt-4 font-bold ${ui.heading}`}>{store.name}</h3>

                {store.address && (
                  <p className={`text-sm mt-1 flex items-start gap-1.5 ${ui.muted}`}>
                    <FiMapPin className="shrink-0 mt-0.5" size={14} />
                    <span className="line-clamp-2">{store.address}</span>
                  </p>
                )}
                {store.phone && (
                  <p className={`text-sm mt-1 flex items-center gap-1.5 ${ui.muted}`}>
                    <FiPhone size={14} /> {store.phone}
                  </p>
                )}
                {!store.address && !store.phone && (
                  <p className={`text-sm mt-1 ${ui.faint}`}>No address or phone added.</p>
                )}
              </div>

              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[#E7EAE1] dark:border-[#262B24]">
                <button onClick={() => handleEdit(store)} className={ui.linkEdit}>
                  <FiEdit2 size={14} /> Edit
                </button>
                <button onClick={() => handleDelete(store)} className={ui.linkDanger}>
                  <FiTrash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <StoreModal
        open={modalOpen}
        store={selectedStore}
        loading={saving}
        onClose={() => {
          setModalOpen(false);
          setSelectedStore(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
};

export default Stores;
