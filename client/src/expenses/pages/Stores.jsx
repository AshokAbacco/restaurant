// ==============================================
// src/expenses/pages/Stores.jsx
// ==============================================

import { useEffect, useState } from "react";
import expenseService from "../services/expenseService";
import StoreModal from "../components/StoreModal";
import { FiPlus, FiEdit2, FiTrash2, FiHome, FiInbox, FiMapPin, FiPhone } from "react-icons/fi";

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
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">
          Stores/branches show up as the "Store" choice when adding an expense.
        </p>

        <button
          onClick={() => {
            setSelectedStore(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-blue-600/20 shrink-0"
        >
          <FiPlus /> Add Store
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-600 px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <FiInbox className="mx-auto text-4xl text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No stores yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first branch, like "Main Store."</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <FiHome />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      store.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {store.isActive ? "Active" : "Disabled"}
                  </span>
                </div>

                <h3 className="mt-4 font-bold text-gray-800">{store.name}</h3>

                {store.address && (
                  <p className="text-sm text-gray-500 mt-1 flex items-start gap-1.5">
                    <FiMapPin className="shrink-0 mt-0.5" size={14} />
                    <span className="line-clamp-2">{store.address}</span>
                  </p>
                )}
                {store.phone && (
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                    <FiPhone size={14} /> {store.phone}
                  </p>
                )}
                {!store.address && !store.phone && (
                  <p className="text-sm text-gray-400 mt-1">No address or phone added.</p>
                )}
              </div>

              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-50">
                <button
                  onClick={() => handleEdit(store)}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <FiEdit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(store)}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600"
                >
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