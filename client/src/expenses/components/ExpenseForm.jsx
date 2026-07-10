// client/src/expenses/components/ExpenseForm.jsx
// v2 — numbered step indicator, richer category tiles,
// nicer review + success screens. Same validation/logic as before.
// v3 — Store is now fetched from the database (Store model) instead of
// a hardcoded array, so newly created stores show up automatically.
// v4 — restyled to match the app's green/cream design system.
// ==============================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import expenseService from "../services/expenseService";
import { useAuth, ROLES } from "../../auth/AuthContext";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCheck,
  FiUpload,
  FiFileText,
  FiAlertCircle,
  FiLock,
  FiHome,
  FiZap,
  FiUsers,
  FiTruck,
  FiTool,
  FiTag,
  FiClipboard,
  FiDollarSign,
  FiCreditCard,
} from "react-icons/fi";
import { ui } from "../expenseTheme";

// ==============================================
// CONSTANTS
// ==============================================

const paymentMethods = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE"];
const paymentStatuses = ["UNPAID", "PARTIAL", "PAID", "OVERDUE"];
const gstSlabs = [0, 5, 12, 18, 28];

const editableStatuses = ["DRAFT", "PENDING_APPROVAL"];
const lockedStatuses = ["APPROVED", "REJECTED", "PAID"];

const STEPS = [
  { label: "Basics", icon: <FiClipboard /> },
  { label: "Money", icon: <FiDollarSign /> },
  { label: "Payment", icon: <FiCreditCard /> },
  { label: "Review", icon: <FiCheck /> },
];

// Deterministic icon per category name — no backend changes needed
const CATEGORY_ICONS = [
  { match: /rent/i, icon: <FiHome /> },
  { match: /electric|power|utilit/i, icon: <FiZap /> },
  { match: /salary|staff|wage/i, icon: <FiUsers /> },
  { match: /vendor|supplier|purchase/i, icon: <FiTruck /> },
  { match: /maintenance|repair/i, icon: <FiTool /> },
];
const iconFor = (name = "") =>
  CATEGORY_ICONS.find((c) => c.match.test(name))?.icon || <FiTag />;

// ==============================================
// SMALL UI HELPERS
// ==============================================

const FieldLabel = ({ children, required }) => (
  <label className={ui.label}>
    {children}
    {required ? (
      <span className="text-[#EF5350]">*</span>
    ) : (
      <span className={`text-xs font-normal ${ui.faint}`}>(optional)</span>
    )}
  </label>
);

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1.5 flex items-center gap-1 text-sm text-[#EF5350]">
      <FiAlertCircle className="shrink-0" />
      {message}
    </p>
  ) : null;

const pillClass = (active) =>
  `rounded-full border-2 px-4 py-2 text-sm font-medium transition-colors ${
    active ? ui.pillActive : `border-[#E7EAE1] dark:border-[#262B24] ${ui.muted}`
  }`;

// ==============================================
// FORM
// ==============================================

const ExpenseForm = ({ mode = "create" }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { hasRole } = useAuth();
  const canApprove = hasRole([ROLES.OWNER, ROLES.MANAGER]);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [stores, setStores] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [attachment, setAttachment] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [originalStatus, setOriginalStatus] = useState("DRAFT");

  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    description: "",
    expenseDate: new Date().toISOString().split("T")[0],
    amount: "",
    gstPercent: 0,
    gstCustom: "",
    discount: "",
    invoiceNumber: "",
    paymentMethod: "",
    paymentStatus: "UNPAID",
    paymentDate: "",
    transactionReference: "",
    status: "DRAFT",
    store: "Main Store",
  });

  useEffect(() => {
    loadCategories();
    loadStores();
    if (mode === "edit") loadExpense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCategories = async () => {
    try {
      setCategories(await expenseService.getCategories());
    } catch (err) {
      setFieldErrors((prev) => ({ ...prev, load: err.message }));
    }
  };

  const loadStores = async () => {
    try {
      setStores(await expenseService.getStores());
    } catch (err) {
      setFieldErrors((prev) => ({ ...prev, load: err.message }));
    }
  };

  const loadExpense = async () => {
    try {
      setLoading(true);
      const expense = await expenseService.getExpense(id);
      const amount = Number(expense.amount) || 0;
      const gstAmount = Number(expense.gstAmount) || 0;
      const impliedPercent = amount > 0 ? Math.round((gstAmount / amount) * 100) : 0;
      const matchedSlab = gstSlabs.includes(impliedPercent) ? impliedPercent : "custom";

      setForm({
        categoryId: expense.categoryId || "",
        title: expense.title || "",
        description: expense.description || "",
        expenseDate: expense.expenseDate ? expense.expenseDate.substring(0, 10) : "",
        amount,
        gstPercent: matchedSlab,
        gstCustom: matchedSlab === "custom" ? gstAmount : "",
        discount: Number(expense.discount) || 0,
        invoiceNumber: expense.invoiceNumber || "",
        paymentMethod: expense.paymentMethod || "",
        paymentStatus: expense.paymentStatus || "UNPAID",
        paymentDate: expense.paymentDate ? expense.paymentDate.substring(0, 10) : "",
        transactionReference: expense.transactionReference || "",
        status: expense.status,
        store: expense.store || "Main Store",
      });
      setOriginalStatus(expense.status);
    } catch (err) {
      setFieldErrors((prev) => ({ ...prev, load: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const gstAmount = useMemo(() => {
    const amount = Number(form.amount) || 0;
    if (form.gstPercent === "custom") return Number(form.gstCustom) || 0;
    return Math.round(amount * (Number(form.gstPercent) / 100));
  }, [form.amount, form.gstPercent, form.gstCustom]);

  const totalPaid = useMemo(() => {
    const amount = Number(form.amount) || 0;
    const discount = Number(form.discount) || 0;
    return Math.max(0, amount + gstAmount - discount);
  }, [form.amount, form.discount, gstAmount]);

  const discountExceedsBill = Number(form.discount) > Number(form.amount || 0) + gstAmount;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setDirty(true);
  };

  const validateStep = (currentStep) => {
    const errors = {};

    if (currentStep === 0) {
      if (!form.categoryId) errors.categoryId = "Please choose a category.";
      if (!form.title.trim()) errors.title = "Give this expense a short title.";
      if (!form.expenseDate) errors.expenseDate = "Pick the date of this expense.";
    }

    if (currentStep === 1) {
      if (!form.amount || Number(form.amount) <= 0) errors.amount = "Please add the bill amount.";
      if (form.gstPercent === "custom" && !form.gstCustom) {
        errors.gstCustom = "Enter the GST amount, or pick a standard slab instead.";
      }
      if (discountExceedsBill) errors.discount = "Discount can't be more than the bill total.";
    }

    if (currentStep === 2) {
      if (!form.paymentMethod) errors.paymentMethod = "Choose how this will be paid.";
      if (["PAID", "PARTIAL"].includes(form.paymentStatus) && !form.paymentDate) {
        errors.paymentDate = "Add the date it was paid.";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => validateStep(step) && setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const jumpTo = (target) => {
    // only allow jumping to steps already completed
    if (target < step) setStep(target);
  };

  const handleCancel = () => {
    if (dirty && !window.confirm("Discard this expense? Your changes won't be saved.")) return;
    navigate("/expenses/list");
  };

  const handleSubmit = async () => {
    const stepsOk = [0, 1, 2].every((s) => validateStep(s));
    if (!stepsOk) {
      setStep([0, 1, 2].find((s) => !validateStep(s)));
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...form,
        amount: Number(form.amount),
        gstAmount,
        discount: Number(form.discount) || 0,
        totalPaid,
      };
      delete payload.gstPercent;
      delete payload.gstCustom;

      if (mode === "create") {
        await expenseService.createExpense(payload);
      } else {
        await expenseService.updateExpense(id, payload);
      }

      setSaved(true);
      setTimeout(() => navigate("/expenses/list"), 1200);
    } catch (err) {
      setFieldErrors((prev) => ({ ...prev, submit: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const statusIsLocked = mode === "edit" && lockedStatuses.includes(originalStatus);
  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  if (saved) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 rounded-full bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 flex items-center justify-center">
            <FiCheck className="text-[#3FA34D] dark:text-[#43B75A] text-4xl" />
          </div>
          <h2 className={`mt-6 text-2xl font-bold ${ui.heading}`}>
            {mode === "create" ? "Expense added" : "Changes saved"}
          </h2>
          <p className={`mt-2 ${ui.muted}`}>Taking you back to the list…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${ui.heading}`}>
          {mode === "create" ? "Add Expense" : "Edit Expense"}
        </h1>
        <p className={`mt-1 text-sm ${ui.muted}`}>A few quick steps — nothing to calculate by hand.</p>
      </div>

      {/* ================= NUMBERED STEP INDICATOR ================= */}
      <div className="mb-8 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s.label} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => jumpTo(i)}
              disabled={i > step}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
                i < step
                  ? "bg-[#3FA34D] dark:bg-[#43B75A] text-white cursor-pointer"
                  : i === step
                  ? "bg-[#3FA34D] dark:bg-[#43B75A] text-white ring-4 ring-[#3FA34D]/20 dark:ring-[#43B75A]/25"
                  : "bg-[#F3F5EE] dark:bg-[#1E241C] text-[#9CA3AF] dark:text-[#6B7280]"
              }`}
            >
              {i < step ? <FiCheck /> : s.icon}
            </button>
            <span
              className={`ml-2 text-sm font-medium hidden sm:block ${
                i <= step ? ui.heading : ui.faint
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-3 ${i < step ? "bg-[#3FA34D] dark:bg-[#43B75A]" : "bg-[#E7EAE1] dark:bg-[#262B24]"}`} />
            )}
          </div>
        ))}
      </div>

      {fieldErrors.load && <FieldError message={fieldErrors.load} />}
      {fieldErrors.submit && (
        <div className="mb-6 rounded-xl bg-[#EF5350]/10 px-4 py-3 text-sm text-[#EF5350]">{fieldErrors.submit}</div>
      )}

      <div className={`${ui.card} p-6`}>
        {/* ================= STEP 0: BASICS ================= */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <FieldLabel required>Category</FieldLabel>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                {categories.map((c) => {
                  const selected = form.categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, categoryId: c.id }));
                        setFieldErrors((prev) => ({ ...prev, categoryId: "" }));
                        setDirty(true);
                      }}
                      className={`relative flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 py-4 px-2 text-xs font-medium transition-all ${
                        selected
                          ? "border-[#3FA34D] dark:border-[#43B75A] bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 text-[#3FA34D] dark:text-[#43B75A]"
                          : `border-[#E7EAE1] dark:border-[#262B24] ${ui.muted} hover:border-[#3FA34D]/30 dark:hover:border-[#43B75A]/40`
                      }`}
                    >
                      {selected && (
                        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] text-white flex items-center justify-center text-[10px]">
                          <FiCheck />
                        </span>
                      )}
                      <span className="text-lg">{iconFor(c.name)}</span>
                      <span className="text-center leading-tight">{c.name}</span>
                    </button>
                  );
                })}
              </div>
              <FieldError message={fieldErrors.categoryId} />
            </div>

            <div>
              <FieldLabel required>Expense Title</FieldLabel>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. June Electricity Bill"
                className={`${ui.input} ${fieldErrors.title ? "border-[#EF5350]" : ""}`}
              />
              <FieldError message={fieldErrors.title} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Date</FieldLabel>
                <input
                  type="date"
                  name="expenseDate"
                  value={form.expenseDate}
                  onChange={handleChange}
                  className={`${ui.input} ${fieldErrors.expenseDate ? "border-[#EF5350]" : ""}`}
                />
                <FieldError message={fieldErrors.expenseDate} />
              </div>

              <div>
                <FieldLabel required>Store</FieldLabel>
                <select name="store" value={form.store} onChange={handleChange} className={ui.input}>
                  {stores.length === 0 && (
                    <option value={form.store}>{form.store || "Loading stores…"}</option>
                  )}
                  {stores.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <FieldLabel required={false}>Description</FieldLabel>
              <textarea
                rows={3}
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Any extra detail worth noting"
                className={`${ui.input} resize-none`}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 1: MONEY ================= */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <FieldLabel required>Bill Amount</FieldLabel>
              <div className="relative">
                <span className={`absolute left-4 top-3 text-lg ${ui.faint}`}>₹</span>
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="0"
                  className={`${ui.input} py-3 pl-9 pr-4 text-xl font-bold ${fieldErrors.amount ? "border-[#EF5350]" : ""}`}
                />
              </div>
              <FieldError message={fieldErrors.amount} />
            </div>

            <div>
              <FieldLabel required={false}>GST</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {gstSlabs.map((slab) => (
                  <button
                    type="button"
                    key={slab}
                    onClick={() => { setForm((prev) => ({ ...prev, gstPercent: slab })); setDirty(true); }}
                    className={pillClass(form.gstPercent === slab)}
                  >
                    {slab}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setForm((prev) => ({ ...prev, gstPercent: "custom" })); setDirty(true); }}
                  className={pillClass(form.gstPercent === "custom")}
                >
                  Custom
                </button>
              </div>

              {form.gstPercent === "custom" ? (
                <div className="mt-3">
                  <div className="relative">
                    <span className={`absolute left-4 top-2.5 ${ui.faint}`}>₹</span>
                    <input
                      type="number"
                      name="gstCustom"
                      value={form.gstCustom}
                      onChange={handleChange}
                      placeholder="GST amount"
                      className={`${ui.input} py-2 pl-8 pr-4`}
                    />
                  </div>
                  <FieldError message={fieldErrors.gstCustom} />
                </div>
              ) : (
                <p className={`mt-2 text-sm ${ui.muted}`}>
                  ≈ ₹{gstAmount.toLocaleString("en-IN")} calculated automatically
                </p>
              )}
            </div>

            <div>
              <FieldLabel required={false}>Discount</FieldLabel>
              <div className="relative">
                <span className={`absolute left-4 top-2.5 ${ui.faint}`}>₹</span>
                <input
                  type="number"
                  name="discount"
                  value={form.discount}
                  onChange={handleChange}
                  placeholder="0"
                  className={`${ui.input} py-2 pl-8 pr-4 ${fieldErrors.discount ? "border-[#EF5350]" : ""}`}
                />
              </div>
              <FieldError message={fieldErrors.discount} />
            </div>

            <div>
              <FieldLabel required={false}>Invoice Number</FieldLabel>
              <input
                type="text"
                name="invoiceNumber"
                value={form.invoiceNumber}
                onChange={handleChange}
                className={ui.input}
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-[#3FA34D] dark:bg-[#43B75A] p-5 text-white">
              <span className="font-semibold">Total to Pay</span>
              <span className="text-2xl font-bold">₹{totalPaid.toLocaleString("en-IN")}</span>
            </div>

            <div>
              <FieldLabel required={false}>Bill / Receipt Photo</FieldLabel>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#E7EAE1] dark:border-[#262B24] py-8 hover:border-[#3FA34D]/40 dark:hover:border-[#43B75A]/40 hover:bg-[#3FA34D]/5 dark:hover:bg-[#43B75A]/10 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                />
                {attachment ? (
                  <>
                    <FiFileText className="text-2xl text-[#3FA34D] dark:text-[#43B75A]" />
                    <span className={`text-sm font-medium ${ui.heading}`}>{attachment.name}</span>
                  </>
                ) : (
                  <>
                    <FiUpload className={`text-2xl ${ui.faint}`} />
                    <span className={`text-sm ${ui.muted}`}>Tap to upload PDF/JPG/PNG</span>
                  </>
                )}
              </label>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PAYMENT ================= */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <FieldLabel required>Payment Method</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((method) => (
                  <button
                    type="button"
                    key={method}
                    onClick={() => { setForm((prev) => ({ ...prev, paymentMethod: method })); setDirty(true); }}
                    className={pillClass(form.paymentMethod === method)}
                  >
                    {method.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
              <FieldError message={fieldErrors.paymentMethod} />
            </div>

            <div>
              <FieldLabel required>Payment Status</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {paymentStatuses.map((status) => (
                  <button
                    type="button"
                    key={status}
                    onClick={() => { setForm((prev) => ({ ...prev, paymentStatus: status })); setDirty(true); }}
                    className={pillClass(form.paymentStatus === status)}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <p className={`mt-2 text-xs ${ui.faint}`}>
                Payment Method is how it will be paid; Payment Status is whether the money has moved yet.
              </p>
            </div>

            {["PAID", "PARTIAL"].includes(form.paymentStatus) && (
              <div className="rounded-2xl bg-[#F3F5EE] dark:bg-[#1E241C] p-4 space-y-4">
                <div>
                  <FieldLabel required>Payment Date</FieldLabel>
                  <input
                    type="date"
                    name="paymentDate"
                    value={form.paymentDate}
                    onChange={handleChange}
                    className={`${ui.input} bg-white dark:bg-[#0D110C] ${fieldErrors.paymentDate ? "border-[#EF5350]" : ""}`}
                  />
                  <FieldError message={fieldErrors.paymentDate} />
                </div>
                <div>
                  <FieldLabel required={false}>Transaction Reference</FieldLabel>
                  <input
                    type="text"
                    name="transactionReference"
                    value={form.transactionReference}
                    onChange={handleChange}
                    placeholder="UPI ref / cheque number"
                    className={`${ui.input} bg-white dark:bg-[#0D110C]`}
                  />
                </div>
              </div>
            )}

            <div className={`rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#1E241C] p-4`}>
              <FieldLabel required={false}>Expense Status</FieldLabel>
              {statusIsLocked ? (
                <div className={`flex items-center gap-2 text-sm ${ui.muted}`}>
                  <FiLock />
                  This expense is <strong className={`mx-1 ${ui.heading}`}>{originalStatus}</strong> — use Approve/Reject on the detail page to change it.
                </div>
              ) : canApprove ? (
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className={`${ui.input} bg-white dark:bg-[#0D110C]`}
                >
                  {editableStatuses.map((status) => (
                    <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
                  ))}
                </select>
              ) : (
                <div className={`flex items-center gap-2 text-sm ${ui.muted}`}>
                  <FiLock />
                  Submitted as <strong className={`mx-1 ${ui.heading}`}>Pending Approval</strong> — only an Owner or Manager can approve.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 3: REVIEW ================= */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-3 mb-5 rounded-2xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 p-4">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#171C17] flex items-center justify-center text-xl text-[#3FA34D] dark:text-[#43B75A] shadow-sm">
                {iconFor(selectedCategory?.name)}
              </div>
              <div>
                <p className={`font-bold ${ui.heading}`}>{form.title}</p>
                <p className={`text-sm ${ui.muted}`}>{selectedCategory?.name} · {form.store}</p>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <SummaryRow label="Date" value={form.expenseDate} />
              <SummaryRow label="Amount" value={`₹${Number(form.amount || 0).toLocaleString("en-IN")}`} />
              <SummaryRow label="GST" value={`₹${gstAmount.toLocaleString("en-IN")}`} />
              <SummaryRow label="Discount" value={`₹${Number(form.discount || 0).toLocaleString("en-IN")}`} />
              <SummaryRow label="Payment Method" value={form.paymentMethod?.replaceAll("_", " ")} />
              <SummaryRow label="Payment Status" value={form.paymentStatus} />
              <SummaryRow label="Expense Status" value={statusIsLocked ? originalStatus : form.status} />
            </div>

            <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#3FA34D] dark:bg-[#43B75A] p-5 text-white">
              <span className="font-semibold">Total to Pay</span>
              <span className="text-2xl font-bold">₹{totalPaid.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        {/* ================= NAVIGATION ================= */}
        <div className="mt-8 flex items-center justify-between border-t border-[#E7EAE1] dark:border-[#262B24] pt-6">
          {step === 0 ? (
            <button type="button" onClick={handleCancel} className={`font-medium ${ui.muted} hover:opacity-80`}>
              Cancel
            </button>
          ) : (
            <button type="button" onClick={goBack} className={`flex items-center gap-2 font-medium ${ui.muted} hover:opacity-80`}>
              <FiArrowLeft /> Back
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext} className={ui.btnPrimary}>
              Next <FiArrowRight />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={loading} className={ui.btnPrimary}>
              {loading ? "Saving..." : "Save Expense"} <FiCheck />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SummaryRow = ({ label, value }) => (
  <div className="flex justify-between border-b border-[#E7EAE1] dark:border-[#262B24] py-2.5 last:border-0">
    <span className="text-[#6B7280] dark:text-[#9CA8A0]">{label}</span>
    <span className="font-medium text-[#1F2937] dark:text-white">{value || "—"}</span>
  </div>
);

export default ExpenseForm;
