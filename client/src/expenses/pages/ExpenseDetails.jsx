// ==============================================
// src/expenses/pages/ExpenseDetails.jsx
// ==============================================

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import expenseService from "../services/expenseService";
import { FiArrowLeft, FiEdit2, FiFileText } from "react-icons/fi";

const STATUS_STYLES = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  PAID: "bg-green-100 text-green-700",
};

const STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Waiting for Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

const PAYMENT_STYLES = {
  PAID: "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  UNPAID: "bg-gray-100 text-gray-600",
};

const Badge = ({ styles, label }) => (
  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${styles}`}>
    {label}
  </span>
);

const Row = ({ label, value }) => (
  <div className="flex justify-between py-2.5 border-b border-gray-50 last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className="text-right font-medium text-gray-800">{value ?? "—"}</span>
  </div>
);

const formatMoney = (value = 0) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const ExpenseDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [expense, setExpense] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadExpense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadExpense = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await expenseService.getExpense(id);
      setExpense(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Loading expense…</div>;
  }

  if (error || !expense) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-600 font-medium">{error || "Expense not found."}</p>
        <Link to="/expenses/list" className="text-blue-600 text-sm mt-2 inline-block">
          Back to expenses
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/expenses/list")}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6"
      >
        <FiArrowLeft /> Back to expenses
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 font-medium">{expense.expenseNumber}</p>
            <h1 className="text-2xl font-bold text-gray-800 mt-1">{expense.title}</h1>
            <p className="text-gray-500 mt-1">{expense.category?.name}</p>

            <div className="flex gap-2 mt-4">
              <Badge styles={STATUS_STYLES[expense.status]} label={STATUS_LABELS[expense.status] || expense.status} />
              <Badge styles={PAYMENT_STYLES[expense.paymentStatus]} label={expense.paymentStatus} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Paid</p>
              <p className="text-3xl font-bold text-blue-700">{formatMoney(expense.totalPaid)}</p>
            </div>

            <Link
              to={`/expenses/edit/${expense.id}`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
            >
              <FiEdit2 size={14} /> Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Basic */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-3">Details</h2>
          <Row label="Expense Date" value={new Date(expense.expenseDate).toLocaleDateString()} />
          <Row label="Store" value={expense.store} />
          <Row label="Description" value={expense.description || "—"} />
        </div>

        {/* Financial */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-3">Amount Breakdown</h2>
          <Row label="Bill Amount" value={formatMoney(expense.amount)} />
          <Row label="GST" value={formatMoney(expense.gstAmount)} />
          <Row label="Discount" value={formatMoney(expense.discount)} />
          <Row label="Invoice Number" value={expense.invoiceNumber} />
        </div>

        {/* Payment */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-3">Payment</h2>
          <Row label="Method" value={expense.paymentMethod} />
          <Row
            label="Payment Date"
            value={expense.paymentDate ? new Date(expense.paymentDate).toLocaleDateString() : "Not paid yet"}
          />
          <Row label="Reference" value={expense.transactionReference} />
        </div>

        {/* Record info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-800 mb-3">Record</h2>
          <Row label="Created" value={new Date(expense.createdAt).toLocaleString()} />
          <Row label="Last Updated" value={new Date(expense.updatedAt).toLocaleString()} />
        </div>

        {/* Attachments */}
        {expense.attachments?.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
            <h2 className="font-bold text-gray-800 mb-3">Bill / Receipt</h2>
            <div className="flex flex-wrap gap-3">
              {expense.attachments.map((file) => (
                <a
                  key={file.id}
                  href={file.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50"
                >
                  <FiFileText /> {file.fileType?.toUpperCase()}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseDetails;