// ==============================================
// client/src/employees/EmployeeDetails.jsx
// ==============================================

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  FiArrowLeft,
  FiEdit2,
  FiMail,
  FiPhone,
  FiMapPin,
  FiCalendar,
  FiBriefcase,
  FiUser,
  FiLock,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiDollarSign,
  FiAward,
  FiTrendingUp,
  FiActivity,
  FiKey,
  FiEye,
  FiEyeOff,
  FiLogIn,
  FiLogOut,
  FiPlus,
  FiX,
} from "react-icons/fi";

import PageHeader from "../components/layout/PageHeader";
import { OwnerOnly } from "../auth/RoleGuard";
import { useAuth } from "../auth/AuthContext";
import employeesService from "./employeesService";

// ==========================================
// SMALL HELPERS
// ==========================================

const formatDate = (value, withTime = false) => {
  if (!value) return "—";
  const date = new Date(value);
  return withTime
    ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

// yyyy-mm-dd for <input type="date"> defaults
const todayInputValue = () => new Date().toISOString().substring(0, 10);

// yyyy-mm for <input type="month"> defaults
const thisMonthInputValue = () => new Date().toISOString().substring(0, 7);

const isSameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

// Ticks once a second, showing elapsed HH:MM:SS since `since`. Used to show
// a live "currently working for..." duration between clock-in and clock-out.
const LiveDuration = ({ since }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const totalSeconds = Math.max(
    0,
    Math.floor((now - new Date(since).getTime()) / 1000),
  );
  const pad = (n) => String(n).padStart(2, "0");
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  return (
    <span className="font-mono font-semibold">
      {pad(hrs)}:{pad(mins)}:{pad(secs)}
    </span>
  );
};

const statusStyles = {
  ACTIVE: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  INACTIVE: "bg-[#F3F5EE] text-[#4B5563] dark:bg-white/5 dark:text-[#9CA8A0]",
  RESIGNED: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  TERMINATED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  PRESENT: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  ABSENT: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  HALF_DAY: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300",
  LEAVE: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  HOLIDAY: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  PAID: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  UNPAID: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

const Badge = ({ value }) => (
  <span
    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
      statusStyles[value] || "bg-[#F3F5EE] text-[#4B5563] dark:bg-white/5 dark:text-[#9CA8A0]"
    }`}
  >
    {value}
  </span>
);

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#E7EAE1] dark:border-[#262B24] last:border-0">
    <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div>
      <p className="text-xs text-[#6B7280] dark:text-[#9CA8A0]">{label}</p>
      <p className="text-sm font-medium text-[#1F2937] dark:text-[#E4E9E2]">{value || "—"}</p>
    </div>
  </div>
);

const EmptyState = ({ text }) => (
  <div className="py-12 text-center text-[#6B7280] dark:text-[#9CA8A0]">
    <FiAlertCircle className="mx-auto text-3xl text-[#C7CCC2] dark:text-[#4A5248] mb-3" />
    {text}
  </div>
);

const TabLoader = () => (
  <div className="py-12 flex justify-center">
    <div className="w-8 h-8 border-4 border-[#3FA34D] dark:border-[#43B75A] border-t-transparent rounded-full animate-spin" />
  </div>
);

// Small inline error banner used inside the action forms below
const InlineError = ({ message }) =>
  message ? (
    <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-[#EF5350] dark:text-red-400 px-4 py-3 text-sm mb-4">
      {message}
    </div>
  ) : null;

const TABS = [
  { key: "overview", label: "Overview", icon: <FiUser /> },
  { key: "account", label: "Login Account", icon: <FiLock /> },
  { key: "attendance", label: "Attendance", icon: <FiClock /> },
  { key: "leaves", label: "Leaves", icon: <FiCalendar /> },
  { key: "payroll", label: "Payroll", icon: <FiDollarSign /> },
  { key: "incentives", label: "Incentives", icon: <FiAward /> },
  { key: "performance", label: "Performance", icon: <FiTrendingUp /> },
  { key: "activity", label: "Activity Log", icon: <FiActivity /> },
];

// ==========================================
// MAIN COMPONENT
// ==========================================

const EmployeeDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // ==========================================
  // LOAD EMPLOYEE
  // ==========================================

  const loadEmployee = async () => {
    setLoading(true);
    const result = await employeesService.getEmployee(id);

    if (!result.success) {
      setError(result.message);
    } else {
      setEmployee(result.data);
      setError("");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ==========================================
  // LOADING / ERROR STATES
  // ==========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-[#3FA34D] dark:border-[#43B75A] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm p-12 text-center">
        <FiAlertCircle className="mx-auto text-5xl text-red-300 dark:text-red-500/50 mb-4" />
        <h3 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">Employee not found</h3>
        <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-2">
          {error || "This employee record could not be loaded."}
        </p>
        <Link
          to="/employees"
          className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white font-semibold"
        >
          <FiArrowLeft />
          Back to Employees
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F3F5EE] dark:bg-[#12160F]">
      <PageHeader
        title={employee.fullName}
        subtitle={`${employee.designation} · ${employee.department} · ${employee.employeeCode}`}
        icon={<FiUser />}
        action={
          <div className="flex items-center gap-3">
            <Link
              to="/employees"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#374151] dark:text-[#C3CBC0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 font-semibold transition"
            >
              <FiArrowLeft />
              Back
            </Link>

            <OwnerOnly>
              <Link
                to={`/employees/${id}/edit`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white font-semibold shadow-lg transition"
              >
                <FiEdit2 />
                Edit
              </Link>
            </OwnerOnly>
          </div>
        }
      />

      {/* ================= PROFILE SUMMARY CARD ================= */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-5 justify-between">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] text-white flex items-center justify-center text-3xl font-bold shadow-lg flex-shrink-0">
              {employee.fullName?.charAt(0)?.toUpperCase() || "E"}
            </div>

            <div>
              <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                {employee.fullName}
              </h2>
              <p className="text-[#6B7280] dark:text-[#9CA8A0]">{employee.employeeCode}</p>
              <div className="mt-2">
                <Badge value={employee.status} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[#6B7280] dark:text-[#9CA8A0]">Mobile</p>
              <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                {employee.mobile || "—"}
              </p>
            </div>
            <div>
              <p className="text-[#6B7280] dark:text-[#9CA8A0]">Email</p>
              <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                {employee.email || "—"}
              </p>
            </div>
            <div>
              <p className="text-[#6B7280] dark:text-[#9CA8A0]">Joined</p>
              <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                {formatDate(employee.joiningDate)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= TABS ================= */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#1D231C]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap transition-all border-b-2 ${
                activeTab === tab.key
                  ? "border-[#3FA34D] dark:border-[#43B75A] text-[#3FA34D] dark:text-[#43B75A] bg-white dark:bg-[#171C17]"
                  : "border-transparent text-[#6B7280] dark:text-[#9CA8A0] hover:text-[#374151] dark:hover:text-[#E4E9E2]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "overview" && <OverviewTab employee={employee} />}
          {activeTab === "account" && (
            <AccountTab employee={employee} onAccountCreated={loadEmployee} />
          )}
          {activeTab === "attendance" && (
            <AttendanceTab employeeId={id} isOwner={isOwner} />
          )}
          {activeTab === "leaves" && (
            <LeavesTab
              employeeId={id}
              approverId={user?.id}
              isOwner={isOwner}
            />
          )}
          {activeTab === "payroll" && (
            <PayrollTab employeeId={id} isOwner={isOwner} />
          )}
          {activeTab === "incentives" && (
            <IncentivesTab
              employeeId={id}
              approverId={user?.id}
              isOwner={isOwner}
            />
          )}
          {activeTab === "performance" && (
            <PerformanceTab employeeId={id} isOwner={isOwner} />
          )}
          {activeTab === "activity" && <ActivityTab employeeId={id} />}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// OVERVIEW TAB
// ==========================================

const OverviewTab = ({ employee }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div>
      <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-2">Personal & Contact</h4>
      <InfoRow icon={<FiUser />} label="Gender" value={employee.gender} />
      <InfoRow
        icon={<FiCalendar />}
        label="Date of Birth"
        value={formatDate(employee.dob)}
      />
      <InfoRow icon={<FiPhone />} label="Mobile" value={employee.mobile} />
      <InfoRow icon={<FiMail />} label="Email" value={employee.email} />
      <InfoRow
        icon={<FiPhone />}
        label="Emergency Contact"
        value={employee.emergencyContact}
      />
    </div>

    <div>
      <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-2">Employment</h4>
      <InfoRow
        icon={<FiBriefcase />}
        label="Department"
        value={employee.department}
      />
      <InfoRow
        icon={<FiBriefcase />}
        label="Designation"
        value={employee.designation}
      />
      <InfoRow
        icon={<FiCalendar />}
        label="Joining Date"
        value={formatDate(employee.joiningDate)}
      />
      <InfoRow
        icon={<FiBriefcase />}
        label="Employment Type"
        value={employee.employmentType}
      />
      <InfoRow
        icon={<FiMapPin />}
        label="Store / Branch"
        value={employee.store}
      />
    </div>

    <div className="lg:col-span-2">
      <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-2">Address</h4>
      {employee.address ? (
        <p className="text-sm text-[#374151] dark:text-[#C3CBC0] leading-6">
          {[
            employee.address.houseNo,
            employee.address.street,
            employee.address.city,
            employee.address.state,
            employee.address.pincode,
          ]
            .filter(Boolean)
            .join(", ") || "No address on file"}
        </p>
      ) : (
        <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">No address on file.</p>
      )}
    </div>
  </div>
);

// ==========================================
// ACCOUNT TAB — view or create login account
// ==========================================

const AccountTab = ({ employee, onAccountCreated }) => {
  const account = employee.userAccount;

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: employee.email || "",
    password: "",
    pin: "",
    role: "CASHIER",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.password || formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (!formData.role) newErrors.role = "Select a role";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!validate()) return;

    setSaving(true);
    const result = await employeesService.createLoginAccount(
      employee.id,
      formData,
    );
    setSaving(false);

    if (!result.success) {
      setSubmitError(result.message);
      return;
    }

    setShowForm(false);
    onAccountCreated();
  };

  if (account) {
    return (
      <div className="max-w-lg">
        <div className="rounded-2xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 p-6 flex gap-4">
          <FiCheckCircle className="text-[#3FA34D] dark:text-[#43B75A] text-2xl flex-shrink-0" />
          <div>
            <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2]">Login account active</h4>
            <p className="text-sm text-[#4B5563] dark:text-[#9CA8A0] mt-1">
              This employee can sign in to the dashboard / POS with the
              credentials below.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <InfoRow
            icon={<FiUser />}
            label="Username"
            value={account.username}
          />
          <InfoRow
            icon={<FiMail />}
            label="Login Email"
            value={account.email}
          />
          <InfoRow icon={<FiKey />} label="Role" value={account.role} />
          <InfoRow
            icon={<FiCheckCircle />}
            label="Account Status"
            value={account.isActive ? "Active" : "Disabled"}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      {!showForm ? (
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 p-6">
          <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2]">No login account yet</h4>
          <p className="text-sm text-[#4B5563] dark:text-[#9CA8A0] mt-1 leading-6">
            This employee currently cannot sign in to the dashboard or POS.
            Create a login account below if they need system access (e.g.
            Cashiers, Kitchen staff, Managers).
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white font-semibold transition"
          >
            <FiLock />
            Create Login Account
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {submitError && (
            <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-[#EF5350] dark:text-red-400 px-4 py-3 text-sm">
              {submitError}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
              Username *
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="e.g. ramesh.k"
              className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                errors.username
                  ? "border-[#EF5350] dark:border-red-500/60 bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark]"
                  : "border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
              }`}
            />
            {errors.username && (
              <p className="text-[#EF5350] dark:text-red-400 text-sm mt-1">{errors.username}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
              Login Email (optional)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                className={`w-full px-4 py-3 pr-12 rounded-xl border outline-none transition-all ${
                  errors.password
                    ? "border-[#EF5350] dark:border-red-500/60 bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark]"
                    : "border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-[#6B7280] dark:text-[#9CA8A0]"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[#EF5350] dark:text-red-400 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
              POS Quick-Login PIN (optional)
            </label>
            <input
              type="text"
              name="pin"
              value={formData.pin}
              onChange={handleChange}
              placeholder="4-digit PIN for fast POS login"
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
              Role *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none"
            >
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="CASHIER">Cashier</option>
              <option value="CHEF">Chef</option>
              <option value="KITCHEN">Kitchen</option>
              <option value="WAITER">Waiter</option>
              <option value="STORE_KEEPER">Store Keeper</option>
            </select>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA8A0] mt-1">
              This controls what this employee can see and do after logging in.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#374151] dark:text-[#C3CBC0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280] text-white font-semibold transition"
            >
              {saving ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ==========================================
// ATTENDANCE TAB
// ==========================================

const ATTENDANCE_STATUS_OPTIONS = [
  "PRESENT",
  "ABSENT",
  "HALF_DAY",
  "LEAVE",
  "HOLIDAY",
];

const AttendanceTab = ({ employeeId, isOwner }) => {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [manualDate, setManualDate] = useState(todayInputValue());
  const [manualStatus, setManualStatus] = useState("PRESENT");

  const load = async () => {
    setLoading(true);
    const result = await employeesService.listAttendance({
      employeeId,
      limit: 20,
    });
    setRows(result.success ? result.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  // CHANGED: derive today's row from the loaded history (rows are ordered
  // date desc, so today's record — if any — is always rows[0]) so the
  // Check In / Check Out buttons know the employee's current state.
  const todayRecord =
    rows && rows.length && isSameDay(rows[0].date, new Date()) ? rows[0] : null;
  const checkedIn = Boolean(todayRecord?.clockIn);
  const checkedOut = Boolean(todayRecord?.clockOut);

  const handleCheckIn = async () => {
    setActionError("");
    setActionLoading(true);
    const result = await employeesService.checkIn(employeeId);
    setActionLoading(false);
    if (!result.success) {
      setActionError(result.message);
      return;
    }
    load();
  };

  const handleCheckOut = async () => {
    setActionError("");
    setActionLoading(true);
    const result = await employeesService.checkOut(employeeId);
    setActionLoading(false);
    if (!result.success) {
      setActionError(result.message);
      return;
    }
    load();
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setActionError("");
    setActionLoading(true);
    const result = await employeesService.markAttendanceStatus({
      employeeId,
      date: manualDate,
      status: manualStatus,
    });
    setActionLoading(false);
    if (!result.success) {
      setActionError(result.message);
      return;
    }
    load();
  };

  return (
    <div>
      {/* ---- Quick actions ---- */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 md:items-start">
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 rounded-2xl p-5 flex-1">
          <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-1">Today's attendance</h4>

          {/* Live status line */}
          <div className="mb-4 text-sm">
            {checkedOut ? (
              <p className="text-[#374151] dark:text-[#C3CBC0]">
                <span className="font-semibold text-[#358F42] dark:text-[#43B75A]">
                  Completed for today.
                </span>{" "}
                Clocked in {formatDate(todayRecord.clockIn, true)}, out{" "}
                {formatDate(todayRecord.clockOut, true)} — worked{" "}
                <strong>{todayRecord.workingHours ?? "—"}</strong> hrs.
              </p>
            ) : checkedIn ? (
              <p className="text-[#374151] dark:text-[#C3CBC0]">
                <span className="font-semibold text-blue-700 dark:text-blue-300">Checked in</span>{" "}
                at {formatDate(todayRecord.clockIn, true)} — working for{" "}
                <LiveDuration since={todayRecord.clockIn} />
              </p>
            ) : (
              <p className="text-[#4B5563] dark:text-[#9CA8A0]">Not checked in yet today.</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCheckIn}
              disabled={actionLoading || checkedIn}
              title={checkedIn ? "Already checked in today" : "Check in"}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280] disabled:cursor-not-allowed text-white text-sm font-semibold transition"
            >
              <FiLogIn />
              Check In
            </button>
            <button
              onClick={handleCheckOut}
              disabled={actionLoading || !checkedIn || checkedOut}
              title={
                !checkedIn
                  ? "Check in first"
                  : checkedOut
                    ? "Already checked out today"
                    : "Check out"
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4B5563] dark:bg-[#2C332B] hover:bg-[#374151] dark:hover:bg-[#3A423A] disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280] disabled:cursor-not-allowed text-white text-sm font-semibold transition"
            >
              <FiLogOut />
              Check Out
            </button>
          </div>
        </div>

        {isOwner && (
          <form
            onSubmit={handleManualSubmit}
            className="bg-white dark:bg-[#171C17] border border-[#E7EAE1] dark:border-[#262B24] rounded-2xl p-5 flex-1"
          >
            <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-1">
              Set status manually
            </h4>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mb-4">
              For holidays, corrections, or marking a day directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
              />
              <select
                value={manualStatus}
                onChange={(e) => setManualStatus(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
              >
                {ATTENDANCE_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280] text-white text-sm font-semibold transition"
              >
                Save
              </button>
            </div>
          </form>
        )}
      </div>

      <InlineError message={actionError} />

      {/* ---- History ---- */}
      {loading ? (
        <TabLoader />
      ) : !rows.length ? (
        <EmptyState text="No attendance records yet for this employee." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[#6B7280] dark:text-[#9CA8A0] border-b border-[#E7EAE1] dark:border-[#262B24]">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Clock In</th>
                <th className="py-3 pr-4">Clock Out</th>
                <th className="py-3 pr-4">Working Hours</th>
                <th className="py-3 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {rows.map((row) => {
                const isToday = isSameDay(row.date, new Date());
                const stillWorking = isToday && row.clockIn && !row.clockOut;
                return (
                  <tr key={row.id}>
                    <td className="py-3 pr-4">{formatDate(row.date)}</td>
                    <td className="py-3 pr-4">
                      {row.clockIn ? formatDate(row.clockIn, true) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {row.clockOut ? formatDate(row.clockOut, true) : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      {stillWorking ? (
                        <LiveDuration since={row.clockIn} />
                      ) : (
                        (row.workingHours ?? "—")
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge value={row.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==========================================
// LEAVES TAB
// ==========================================

const LEAVE_TYPES = ["CASUAL", "SICK", "PAID", "EMERGENCY"];

const EMPTY_LEAVE_FORM = {
  type: "CASUAL",
  fromDate: todayInputValue(),
  toDate: todayInputValue(),
  reason: "",
};

const LeavesTab = ({ employeeId, approverId, isOwner }) => {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_LEAVE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = async () => {
    setLoading(true);
    const result = await employeesService.listLeaves({ employeeId, limit: 20 });
    setRows(result.success ? result.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleDecision = async (id, action) => {
    setActingId(id);
    await employeesService.decideLeave(id, action, approverId);
    setActingId(null);
    load();
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (new Date(form.toDate) < new Date(form.fromDate)) {
      setSubmitError("The 'to' date can't be before the 'from' date.");
      return;
    }

    setSubmitting(true);
    const result = await employeesService.createLeaveRequest({
      employeeId,
      ...form,
    });
    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.message);
      return;
    }

    setForm(EMPTY_LEAVE_FORM);
    setShowForm(false);
    load();
  };

  return (
    <div>
      <div className="mb-6">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white text-sm font-semibold transition"
          >
            <FiPlus />
            Apply for Leave
          </button>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-[#171C17] border border-[#E7EAE1] dark:border-[#262B24] rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2]">New Leave Request</h4>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-[#9CA3AF] dark:text-[#6B7280] hover:text-[#4B5563] dark:hover:text-[#C3CBC0]"
              >
                <FiX />
              </button>
            </div>

            <InlineError message={submitError} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                  Type
                </label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div />

              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                  From
                </label>
                <input
                  type="date"
                  name="fromDate"
                  value={form.fromDate}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                  To
                </label>
                <input
                  type="date"
                  name="toDate"
                  value={form.toDate}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                  Reason
                </label>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleFormChange}
                  rows={2}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#374151] dark:text-[#C3CBC0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280] text-white text-sm font-semibold transition"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        )}
      </div>

      {loading ? (
        <TabLoader />
      ) : !rows.length ? (
        <EmptyState text="No leave requests found for this employee." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[#6B7280] dark:text-[#9CA8A0] border-b border-[#E7EAE1] dark:border-[#262B24]">
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">From</th>
                <th className="py-3 pr-4">To</th>
                <th className="py-3 pr-4">Reason</th>
                <th className="py-3 pr-4">Status</th>
                {isOwner && <th className="py-3 pr-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4">{row.type}</td>
                  <td className="py-3 pr-4">{formatDate(row.fromDate)}</td>
                  <td className="py-3 pr-4">{formatDate(row.toDate)}</td>
                  <td className="py-3 pr-4">{row.reason || "—"}</td>
                  <td className="py-3 pr-4">
                    <Badge value={row.status} />
                  </td>
                  {isOwner && (
                    <td className="py-3 pr-4 text-right">
                      {row.status === "PENDING" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={actingId === row.id}
                            onClick={() => handleDecision(row.id, "approve")}
                            className="px-3 py-1.5 rounded-lg bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white text-xs font-semibold transition"
                          >
                            Approve
                          </button>
                          <button
                            disabled={actingId === row.id}
                            onClick={() => handleDecision(row.id, "reject")}
                            className="px-3 py-1.5 rounded-lg bg-[#EF5350] dark:bg-red-500 hover:bg-red-600 dark:hover:bg-red-600 text-white text-xs font-semibold transition"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#9CA3AF] dark:text-[#6B7280] text-xs">Decided</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==========================================
// PAYROLL TAB
// ==========================================

const EMPTY_PAYROLL_FORM = {
  month: thisMonthInputValue(),
  basicSalary: "",
  allowances: "0",
  bonus: "0",
  overtimePay: "0",
  deductions: "0",
};

const PayrollTab = ({ employeeId, isOwner }) => {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PAYROLL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [payingId, setPayingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const result = await employeesService.listPayroll({
      employeeId,
      limit: 20,
    });
    setRows(result.success ? result.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!form.basicSalary || Number(form.basicSalary) <= 0) {
      setSubmitError("Enter a valid basic salary.");
      return;
    }

    setSubmitting(true);
    const result = await employeesService.generatePayroll({
      employeeId,
      month: form.month,
      basicSalary: Number(form.basicSalary),
      allowances: Number(form.allowances || 0),
      bonus: Number(form.bonus || 0),
      overtimePay: Number(form.overtimePay || 0),
      deductions: Number(form.deductions || 0),
    });
    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.message);
      return;
    }

    setForm(EMPTY_PAYROLL_FORM);
    setShowForm(false);
    load();
  };

  const handlePay = async (id) => {
    setPayingId(id);
    await employeesService.payPayroll(id);
    setPayingId(null);
    load();
  };

  return (
    <div>
      {isOwner && (
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white text-sm font-semibold transition"
            >
              <FiPlus />
              Generate Payroll
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-[#171C17] border border-[#E7EAE1] dark:border-[#262B24] rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                  Generate Payroll Record
                </h4>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-[#9CA3AF] dark:text-[#6B7280] hover:text-[#4B5563] dark:hover:text-[#C3CBC0]"
                >
                  <FiX />
                </button>
              </div>

              <InlineError message={submitError} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Month
                  </label>
                  <input
                    type="month"
                    name="month"
                    value={form.month}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Basic Salary *
                  </label>
                  <input
                    type="number"
                    name="basicSalary"
                    value={form.basicSalary}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Allowances
                  </label>
                  <input
                    type="number"
                    name="allowances"
                    value={form.allowances}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Bonus
                  </label>
                  <input
                    type="number"
                    name="bonus"
                    value={form.bonus}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Overtime Pay
                  </label>
                  <input
                    type="number"
                    name="overtimePay"
                    value={form.overtimePay}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Deductions
                  </label>
                  <input
                    type="number"
                    name="deductions"
                    value={form.deductions}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#374151] dark:text-[#C3CBC0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280] text-white text-sm font-semibold transition"
                >
                  {submitting ? "Generating..." : "Generate"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <TabLoader />
      ) : !rows.length ? (
        <EmptyState text="No payroll records generated yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[#6B7280] dark:text-[#9CA8A0] border-b border-[#E7EAE1] dark:border-[#262B24]">
                <th className="py-3 pr-4">Month</th>
                <th className="py-3 pr-4">Basic</th>
                <th className="py-3 pr-4">Allowances</th>
                <th className="py-3 pr-4">Bonus</th>
                <th className="py-3 pr-4">Deductions</th>
                <th className="py-3 pr-4">Net Salary</th>
                <th className="py-3 pr-4">Status</th>
                {isOwner && <th className="py-3 pr-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4">{row.month}</td>
                  <td className="py-3 pr-4">₹{row.basicSalary}</td>
                  <td className="py-3 pr-4">₹{row.allowances}</td>
                  <td className="py-3 pr-4">₹{row.bonus}</td>
                  <td className="py-3 pr-4">₹{row.deductions}</td>
                  <td className="py-3 pr-4 font-semibold">₹{row.netSalary}</td>
                  <td className="py-3 pr-4">
                    <Badge value={row.status} />
                  </td>
                  {isOwner && (
                    <td className="py-3 pr-4 text-right">
                      {row.status !== "PAID" ? (
                        <button
                          disabled={payingId === row.id}
                          onClick={() => handlePay(row.id)}
                          className="px-3 py-1.5 rounded-lg bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280] text-white text-xs font-semibold transition"
                        >
                          {payingId === row.id ? "Marking..." : "Mark as Paid"}
                        </button>
                      ) : (
                        <span className="text-[#9CA3AF] dark:text-[#6B7280] text-xs">Paid</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==========================================
// INCENTIVES TAB
// ==========================================

const EMPTY_INCENTIVE_FORM = { type: "", amount: "", reason: "" };

const IncentivesTab = ({ employeeId, approverId, isOwner }) => {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_INCENTIVE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = async () => {
    setLoading(true);
    const result = await employeesService.listIncentives({
      employeeId,
      limit: 20,
    });
    setRows(result.success ? result.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!form.type.trim()) {
      setSubmitError("Enter an incentive type, e.g. Sales Target Bonus.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setSubmitError("Enter a valid amount.");
      return;
    }

    setSubmitting(true);
    const result = await employeesService.createIncentive({
      employeeId,
      type: form.type.trim(),
      amount: Number(form.amount),
      reason: form.reason || null,
      approvedById: approverId || null,
    });
    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.message);
      return;
    }

    setForm(EMPTY_INCENTIVE_FORM);
    setShowForm(false);
    load();
  };

  return (
    <div>
      {isOwner && (
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white text-sm font-semibold transition"
            >
              <FiPlus />
              Add Incentive
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-[#171C17] border border-[#E7EAE1] dark:border-[#262B24] rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2]">Add Incentive</h4>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-[#9CA3AF] dark:text-[#6B7280] hover:text-[#4B5563] dark:hover:text-[#C3CBC0]"
                >
                  <FiX />
                </button>
              </div>

              <InlineError message={submitError} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Type *
                  </label>
                  <input
                    type="text"
                    name="type"
                    value={form.type}
                    onChange={handleFormChange}
                    placeholder="e.g. Sales Target Bonus"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Amount *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Reason
                  </label>
                  <textarea
                    name="reason"
                    value={form.reason}
                    onChange={handleFormChange}
                    rows={2}
                    placeholder="Optional"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#374151] dark:text-[#C3CBC0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280] text-white text-sm font-semibold transition"
                >
                  {submitting ? "Saving..." : "Add Incentive"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <TabLoader />
      ) : !rows.length ? (
        <EmptyState text="No incentives recorded for this employee." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[#6B7280] dark:text-[#9CA8A0] border-b border-[#E7EAE1] dark:border-[#262B24]">
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Amount</th>
                <th className="py-3 pr-4">Reason</th>
                <th className="py-3 pr-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4">{row.type}</td>
                  <td className="py-3 pr-4 font-semibold">₹{row.amount}</td>
                  <td className="py-3 pr-4">{row.reason || "—"}</td>
                  <td className="py-3 pr-4">{formatDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==========================================
// PERFORMANCE TAB
// ==========================================

const EMPTY_PERFORMANCE_FORM = {
  period: thisMonthInputValue(),
  ordersServed: "",
  salesGenerated: "",
  customerRating: "",
  lateArrivals: "",
};

const PerformanceTab = ({ employeeId, isOwner }) => {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_PERFORMANCE_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = async () => {
    setLoading(true);
    const result = await employeesService.listPerformance({ employeeId });
    setRows(result.success ? result.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    setSubmitting(true);
    const result = await employeesService.upsertPerformance({
      employeeId,
      period: form.period,
      ordersServed: form.ordersServed ? Number(form.ordersServed) : 0,
      salesGenerated: form.salesGenerated ? Number(form.salesGenerated) : 0,
      customerRating: form.customerRating ? Number(form.customerRating) : null,
      lateArrivals: form.lateArrivals ? Number(form.lateArrivals) : 0,
    });
    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.message);
      return;
    }

    setForm(EMPTY_PERFORMANCE_FORM);
    setShowForm(false);
    load();
  };

  return (
    <div>
      {isOwner && (
        <div className="mb-6">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white text-sm font-semibold transition"
            >
              <FiPlus />
              Add / Update Performance
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white dark:bg-[#171C17] border border-[#E7EAE1] dark:border-[#262B24] rounded-2xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[#1F2937] dark:text-[#E4E9E2]">Performance Record</h4>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="text-[#9CA3AF] dark:text-[#6B7280] hover:text-[#4B5563] dark:hover:text-[#C3CBC0]"
                >
                  <FiX />
                </button>
              </div>

              <InlineError message={submitError} />
              <p className="text-xs text-[#6B7280] dark:text-[#9CA8A0] mb-4">
                Saving again for the same period updates that record instead of
                creating a duplicate.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Period
                  </label>
                  <input
                    type="month"
                    name="period"
                    value={form.period}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Orders Served
                  </label>
                  <input
                    type="number"
                    name="ordersServed"
                    value={form.ordersServed}
                    onChange={handleFormChange}
                    min="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Sales Generated
                  </label>
                  <input
                    type="number"
                    name="salesGenerated"
                    value={form.salesGenerated}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Customer Rating (0–5)
                  </label>
                  <input
                    type="number"
                    name="customerRating"
                    value={form.customerRating}
                    onChange={handleFormChange}
                    min="0"
                    max="5"
                    step="0.01"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
                    Late Arrivals
                  </label>
                  <input
                    type="number"
                    name="lateArrivals"
                    value={form.lateArrivals}
                    onChange={handleFormChange}
                    min="0"
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#374151] dark:text-[#C3CBC0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280] text-white text-sm font-semibold transition"
                >
                  {submitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {loading ? (
        <TabLoader />
      ) : !rows.length ? (
        <EmptyState text="No performance records logged yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[#6B7280] dark:text-[#9CA8A0] border-b border-[#E7EAE1] dark:border-[#262B24]">
                <th className="py-3 pr-4">Period</th>
                <th className="py-3 pr-4">Orders Served</th>
                <th className="py-3 pr-4">Sales Generated</th>
                <th className="py-3 pr-4">Rating</th>
                <th className="py-3 pr-4">Late Arrivals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-3 pr-4">{row.period}</td>
                  <td className="py-3 pr-4">{row.ordersServed ?? "—"}</td>
                  <td className="py-3 pr-4">₹{row.salesGenerated ?? 0}</td>
                  <td className="py-3 pr-4">{row.customerRating ?? "—"}</td>
                  <td className="py-3 pr-4">{row.lateArrivals ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ==========================================
// ACTIVITY LOG TAB
// ==========================================

const ActivityTab = ({ employeeId }) => {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);

  // CHANGED: manual entry state — lets an owner add a note directly,
  // alongside the automatic entries now generated by check-in/check-out
  // and leave actions.
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const load = async () => {
    const result = await employeesService.listActivityLogs({
      employeeId,
      limit: 30,
    });
    setRows(result.success ? result.data : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;

    setSubmitError("");
    setSubmitting(true);
    const result = await employeesService.createActivityLog({
      employeeId,
      action: note.trim(),
    });
    setSubmitting(false);

    if (!result.success) {
      setSubmitError(result.message);
      return;
    }

    setNote("");
    setShowForm(false);
    load();
  };

  if (loading) return <TabLoader />;

  return (
    <div>
      <div className="mb-5">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white text-sm font-semibold transition"
          >
            <FiPlus />
            Add Note
          </button>
        ) : (
          <form
            onSubmit={handleAddNote}
            className="bg-white dark:bg-[#171C17] border border-[#E7EAE1] dark:border-[#262B24] rounded-2xl p-5"
          >
            <InlineError message={submitError} />
            <label className="block text-sm font-semibold text-[#374151] dark:text-[#C3CBC0] mb-2">
              Manual activity entry
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="e.g. Verbal warning given for late arrival"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none text-sm"
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setNote("");
                  setSubmitError("");
                }}
                className="px-5 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#374151] dark:text-[#C3CBC0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !note.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] disabled:bg-[#D5DAD0] dark:disabled:bg-white/10 dark:disabled:text-[#6B7280] text-white text-sm font-semibold transition"
              >
                {submitting ? "Saving..." : "Save Note"}
              </button>
            </div>
          </form>
        )}
      </div>

      {!rows.length ? (
        <EmptyState text="No activity has been logged for this employee yet." />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex items-start gap-3 py-3 border-b border-[#E7EAE1] dark:border-[#262B24] last:border-0"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300 flex items-center justify-center flex-shrink-0">
                <FiActivity />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                  {row.action}
                </p>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA8A0]">
                  {formatDate(row.createdAt, true)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeDetails;