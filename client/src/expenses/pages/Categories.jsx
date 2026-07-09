// ==============================================
// src/expenses/pages/Categories.jsx
// ==============================================

import { useEffect, useState } from "react";
import expenseService from "../services/expenseService";
import CategoryModal from "../components/CategoryModal";
import { FiPlus, FiEdit2, FiTrash2, FiTag, FiInbox } from "react-icons/fi";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await expenseService.getCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (payload) => {
    try {
      setSaving(true);
      if (selectedCategory) {
        await expenseService.updateCategory(selectedCategory.id, payload);
      } else {
        await expenseService.createCategory(payload);
      }
      setModalOpen(false);
      setSelectedCategory(null);
      loadCategories();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setModalOpen(true);
  };

  const handleDelete = async (category) => {
    if (!window.confirm(`Remove "${category.name}"? Expenses already using it will keep the category.`)) return;

    try {
      await expenseService.deleteCategory(category.id);
      loadCategories();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <p className="text-gray-500 text-sm">
          Categories help you see where money is going — Rent, Electricity, Staff Salary, etc.
        </p>

        <button
          onClick={() => {
            setSelectedCategory(null);
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-blue-600/20 shrink-0"
        >
          <FiPlus /> Add Category
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-600 px-5 py-4 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <FiInbox className="mx-auto text-4xl text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No categories yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first one, like "Rent" or "Utilities."</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <FiTag />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      category.isEnabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {category.isEnabled ? "Active" : "Disabled"}
                  </span>
                </div>

                <h3 className="mt-4 font-bold text-gray-800">{category.name}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                  {category.description || "No description added."}
                </p>
              </div>

              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-50">
                <button
                  onClick={() => handleEdit(category)}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <FiEdit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600"
                >
                  <FiTrash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryModal
        open={modalOpen}
        category={selectedCategory}
        loading={saving}
        onClose={() => {
          setModalOpen(false);
          setSelectedCategory(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
};

export default Categories;