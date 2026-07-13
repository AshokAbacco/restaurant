// client/src/expenses/pages/ExpenseDetails.jsx
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import expenseService from "../services/expenseService";
import { FiArrowLeft, FiEdit2, FiFileText } from "react-icons/fi";
import { ui, STATUS_STYLES, STATUS_LABELS, PAYMENT_STYLES, formatMoney } from "../expenseTheme";
import { Badge } from "../ExpenseUI";

const Row = ({ label, value }) => (
  <div className="flex justify-between py-2.5 border-b border-[#E7EAE1] dark:border-[#262B24] last:border-0">
    <span className={ui.muted}>{label}</span>
    <span className={`text-right font-medium ${ui.heading}`}>{value ?? "—"}</span>
  </div>
);

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
    return <div className={`p-10 text-center ${ui.faint}`}>Loading expense…</div>;
  }

  if (error || !expense) {
    return (
      <div className="p-10 text-center">
        <p className="text-[#EF5350] font-medium">{error || "Expense not found."}</p>
        <Link to="/expenses/list" className="text-[#3FA34D] dark:text-[#43B75A] text-sm mt-2 inline-block hover:opacity-80">
          Back to expenses
        </Link>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate("/expenses/list")}
        className={`flex items-center gap-2 mb-6 ${ui.muted} hover:opacity-80`}
      >
        <FiArrowLeft /> Back to expenses
      </button>

      {/* Header */}
      <div className={`${ui.card} p-6 mb-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-medium ${ui.faint}`}>{expense.expenseNumber}</p>
            <h1 className={`text-2xl font-bold mt-1 ${ui.heading}`}>{expense.title}</h1>
            <p className={`mt-1 ${ui.muted}`}>{expense.category?.name}</p>

            <div className="flex gap-2 mt-4">
              <Badge styles={STATUS_STYLES[expense.status]} label={STATUS_LABELS[expense.status] || expense.status} />
              <Badge styles={PAYMENT_STYLES[expense.paymentStatus]} label={expense.paymentStatus} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <p className={`text-xs ${ui.faint}`}>Total Paid</p>
              <p className="text-3xl font-bold text-[#3FA34D] dark:text-[#43B75A]">{formatMoney(expense.totalPaid)}</p>
            </div>

            <Link to={`/expenses/edit/${expense.id}`} className={`${ui.btnPrimary} text-sm px-5 py-2.5`}>
              <FiEdit2 size={14} /> Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Basic */}
        <div className={`${ui.card} p-6`}>
          <h2 className={`font-bold mb-3 ${ui.heading}`}>Details</h2>
          <Row label="Expense Date" value={new Date(expense.expenseDate).toLocaleDateString()} />
          <Row label="Store" value={expense.store} />
          <Row label="Description" value={expense.description || "—"} />
        </div>

        {/* Financial */}
        <div className={`${ui.card} p-6`}>
          <h2 className={`font-bold mb-3 ${ui.heading}`}>Amount Breakdown</h2>
          <Row label="Bill Amount" value={formatMoney(expense.amount)} />
          <Row label="GST" value={formatMoney(expense.gstAmount)} />
          <Row label="Discount" value={formatMoney(expense.discount)} />
          <Row label="Invoice Number" value={expense.invoiceNumber} />
        </div>

        {/* Payment */}
        <div className={`${ui.card} p-6`}>
          <h2 className={`font-bold mb-3 ${ui.heading}`}>Payment</h2>
          <Row label="Method" value={expense.paymentMethod} />
          <Row
            label="Payment Date"
            value={expense.paymentDate ? new Date(expense.paymentDate).toLocaleDateString() : "Not paid yet"}
          />
          <Row label="Reference" value={expense.transactionReference} />
        </div>

        {/* Record info */}
        <div className={`${ui.card} p-6`}>
          <h2 className={`font-bold mb-3 ${ui.heading}`}>Record</h2>
          <Row label="Created" value={new Date(expense.createdAt).toLocaleString()} />
          <Row label="Last Updated" value={new Date(expense.updatedAt).toLocaleString()} />
        </div>

        {/* Attachments */}
        {expense.attachments?.length > 0 && (
          <div className={`${ui.card} p-6 lg:col-span-2`}>
            <h2 className={`font-bold mb-3 ${ui.heading}`}>Bill / Receipt</h2>
            <div className="flex flex-wrap gap-3">
              {expense.attachments.map((file) => (
                <a
                  key={file.id}
                  href={file.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 border border-[#E7EAE1] dark:border-[#262B24] rounded-xl px-4 py-2.5 text-sm text-[#3FA34D] dark:text-[#43B75A] hover:bg-[#3FA34D]/5 dark:hover:bg-[#43B75A]/10 transition-colors"
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
