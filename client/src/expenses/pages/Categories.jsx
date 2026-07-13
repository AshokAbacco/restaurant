// client/src/expenses/pages/Categories.jsx
import { useEffect, useState } from "react";
import expenseService from "../services/expenseService";
import CategoryModal from "../components/CategoryModal";
import { FiPlus, FiEdit2, FiTrash2, FiTag, FiInbox } from "react-icons/fi";
import { ui } from "../expenseTheme";
import { ErrorBanner, SkeletonGrid, EmptyState } from "../ExpenseUI";

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className={`text-sm ${ui.muted}`}>
          Categories help you see where money is going — Rent, Electricity, Staff Salary, etc.
        </p>

        <button
          onClick={() => {
            setSelectedCategory(null);
            setModalOpen(true);
          }}
          className={`${ui.btnPrimary} shrink-0`}
        >
          <FiPlus /> Add Category
        </button>
      </div>

      {error && <div className="mb-6"><ErrorBanner>{error}</ErrorBanner></div>}

      {loading ? (
        <SkeletonGrid count={6} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<FiInbox className="mx-auto" />}
          title="No categories yet"
          subtitle='Add your first one, like "Rent" or "Utilities."'
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div key={category.id} className={`${ui.card} p-5 flex flex-col justify-between`}>
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 flex items-center justify-center text-[#3FA34D] dark:text-[#43B75A]">
                    <FiTag />
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      category.isEnabled ? ui.badgeGreen : ui.badgeGray
                    }`}
                  >
                    {category.isEnabled ? "Active" : "Disabled"}
                  </span>
                </div>

                <h3 className={`mt-4 font-bold ${ui.heading}`}>{category.name}</h3>
                <p className={`text-sm mt-1 line-clamp-2 ${ui.muted}`}>
                  {category.description || "No description added."}
                </p>
              </div>

              <div className="flex items-center gap-4 mt-5 pt-4 border-t border-[#E7EAE1] dark:border-[#262B24]">
                <button onClick={() => handleEdit(category)} className={ui.linkEdit}>
                  <FiEdit2 size={14} /> Edit
                </button>
                <button onClick={() => handleDelete(category)} className={ui.linkDanger}>
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
