// ==============================================
// src/expenses/pages/ExpensesList.jsx
// ==============================================

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import expenseService from "../services/expenseService";
import ExpenseFilters from "../components/ExpenseFilters";
import ExpenseTable from "../components/ExpenseTable";
import { FiPlus } from "react-icons/fi";

const ExpensesList = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(loadExpenses, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, paymentStatus, category]);

  const loadCategories = async () => {
    try {
      const data = await expenseService.getCategories();
      setCategories(data);
    } catch (err) {
      // categories failing to load shouldn't block the page
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("status", status);
      if (paymentStatus) params.append("paymentStatus", paymentStatus);
      if (category) params.append("category", category);

      const query = params.toString() ? `?${params.toString()}` : "";
      const data = await expenseService.getExpenses(query);
      setExpenses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Remove "${title}"? This can't be undone.`)) return;

    try {
      await expenseService.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-end mb-6">
        <Link
          to="/expenses/add"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-lg shadow-blue-600/20"
        >
          <FiPlus /> Add Expense
        </Link>
      </div>

      <ExpenseFilters
        search={search}
        setSearch={setSearch}
        status={status}
        setStatus={setStatus}
        paymentStatus={paymentStatus}
        setPaymentStatus={setPaymentStatus}
        category={category}
        setCategory={setCategory}
        categories={categories}
        onRefresh={loadExpenses}
      />

      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-600 px-5 py-4 text-sm">
          {error}
        </div>
      )}

      <ExpenseTable expenses={expenses} loading={loading} onDelete={handleDelete} />
    </div>
  );
};

export default ExpensesList;