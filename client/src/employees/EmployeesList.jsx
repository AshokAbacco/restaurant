// ==============================================
// client/src/employees/EmployeesList.jsx
// ==============================================

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiUsers,
  FiPlus,
  FiSearch,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiUserCheck,
  FiUserX,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiMail,
  FiPhone,
  FiCheckSquare,
  FiLogIn,
  FiLogOut,
} from "react-icons/fi";

import PageHeader from "../components/layout/PageHeader";
import { OwnerOnly } from "../auth/RoleGuard";
import employeesService from "./employeesService";

// ==========================================
// STATUS BADGE
// ==========================================

const statusStyles = {
  ACTIVE: "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300",
  INACTIVE: "bg-[#F3F5EE] text-[#4B5563] dark:bg-white/5 dark:text-[#9CA8A0]",
  RESIGNED: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  TERMINATED: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
      statusStyles[status] || "bg-[#F3F5EE] text-[#4B5563] dark:bg-white/5 dark:text-[#9CA8A0]"
    }`}
  >
    {status}
  </span>
);

// ==========================================
// STAT CARD
// ==========================================

const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm p-5 flex items-center gap-4">
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}
    >
      {icon}
    </div>

    <div>
      <p className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">{value ?? "—"}</p>
      <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{label}</p>
    </div>
  </div>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

const EmployeesList = () => {
  const navigate = useNavigate();

  // ---------- data state ----------

  const [employees, setEmployees] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [stats, setStats] = useState(null);

  // ---------- filter state ----------

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");

  // ---------- ui state ----------

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // CHANGED: end-of-day attendance sweep state
  const [closingDay, setClosingDay] = useState(false);
  const [closeDayMessage, setCloseDayMessage] = useState("");

  // CHANGED: quick check-in/out state — map of employeeId -> today's
  // attendance record, so the list can show/enable the right button
  // without opening each employee's profile.
  const [todayAttendance, setTodayAttendance] = useState({});
  const [attendanceActionId, setAttendanceActionId] = useState(null);

  // ==========================================
  // LOAD STATS
  // ==========================================

  const loadStats = async () => {
    const result = await employeesService.getDashboardStats();
    if (result.success) setStats(result.data);
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================
  // LOAD TODAY'S ATTENDANCE (for the quick check-in/out column)
  // ==========================================

  const loadTodayAttendance = async () => {
    const todayStr = new Date().toISOString().substring(0, 10);
    const result = await employeesService.listAttendance({
      from: todayStr,
      to: todayStr,
      limit: 500,
    });

    if (result.success) {
      const map = {};
      (result.data || []).forEach((row) => {
        map[row.employeeId] = row;
      });
      setTodayAttendance(map);
    }
  };

  useEffect(() => {
    loadTodayAttendance();
  }, []);

  // ==========================================
  // LOAD EMPLOYEES (debounced on search change)
  // ==========================================

  const fetchEmployees = async () => {
    setLoading(true);
    setError("");

    const result = await employeesService.listEmployees({
      search,
      status,
      department,
      page,
      limit,
    });

    if (!result.success) {
      setError(result.message);
      setEmployees([]);
      setTotal(0);
    } else {
      setEmployees(result.data || []);
      setTotal(result.total || 0);
    }

    setLoading(false);
    loadTodayAttendance();
  };

  useEffect(() => {
    const timer = setTimeout(fetchEmployees, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, department, page]);

  // ==========================================
  // QUICK CHECK-IN / CHECK-OUT (right from the list, no need to open a
  // profile). Check In is disabled once an employee has clocked in today;
  // Check Out stays disabled until they have, and locks again once they've
  // clocked out.
  // ==========================================

  const handleQuickCheckIn = async (employeeId) => {
    setAttendanceActionId(employeeId);
    const result = await employeesService.checkIn(employeeId);
    setAttendanceActionId(null);

    if (!result.success) {
      setError(result.message);
      return;
    }
    loadTodayAttendance();
    loadStats();
  };

  const handleQuickCheckOut = async (employeeId) => {
    setAttendanceActionId(employeeId);
    const result = await employeesService.checkOut(employeeId);
    setAttendanceActionId(null);

    if (!result.success) {
      setError(result.message);
      return;
    }
    loadTodayAttendance();
    loadStats();
  };

  // ==========================================
  // END-OF-DAY ATTENDANCE SWEEP
  // Marks every ACTIVE employee who has no attendance record for today as
  // ABSENT. Employees who checked in are PRESENT, employees whose leave was
  // approved already show LEAVE — this only fills in the remaining gap.
  // ==========================================

  const handleCloseDay = async () => {
    setClosingDay(true);
    setCloseDayMessage("");

    const result = await employeesService.closeDayAttendance();

    setClosingDay(false);

    if (!result.success) {
      setCloseDayMessage(result.message);
      return;
    }

    setCloseDayMessage(
      result.marked > 0
        ? `Marked ${result.marked} employee(s) as absent for today.`
        : "Everyone already has an attendance record for today.",
    );
    fetchEmployees();
  };

  // ==========================================
  // FILTER HELPERS
  // ==========================================

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setDepartment("");
    setPage(1);
  };

  const hasFilters = search || status || department;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // ==========================================
  // DELETE
  // ==========================================

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);

    const result = await employeesService.deleteEmployee(deleteTarget.id);

    setDeleting(false);
    setDeleteTarget(null);

    if (result.success) {
      fetchEmployees();
    } else {
      setError(result.message);
    }
  };

  // ==========================================
  // UI
  // ==========================================
 
  return (
    <div className="min-h-full bg-[#F3F5EE] dark:bg-[#12160F]">
      <PageHeader
        title="Employees"
        subtitle="Manage your staff records — add new hires, update details, track status, and open a profile for attendance, leave, payroll, incentives and performance history."
        icon={<FiUsers />}
        showRefresh
        loading={loading}
        onRefresh={fetchEmployees}
        action={
          <OwnerOnly
            fallback={
              <span className="text-sm text-[#9CA3AF] dark:text-[#6B7280] italic">
                Only Owners can add or remove employees
              </span>
            }
          >
            <div className="flex items-center gap-3">
              <button
                onClick={handleCloseDay}
                disabled={closingDay}
                title="Mark every active employee with no attendance record today as Absent"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#374151] dark:text-[#C3CBC0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 disabled:opacity-60 font-semibold transition"
              >
                <FiCheckSquare />
                {closingDay ? "Closing..." : "Close Attendance for Today"}
              </button>

              <Link
                to="/employees/new"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <FiPlus />
                Add Employee
              </Link>
            </div>
          </OwnerOnly>
        }
      />

      {closeDayMessage && (
        <div className="mb-6 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-300 px-5 py-4">
          {closeDayMessage}
        </div>
      )}

      {/* ================= STAT CARDS ================= */}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          icon={<FiUsers />}
          label="Active Employees"
          value={stats?.totalEmployees}
          color="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300"
        />
        <StatCard
          icon={<FiUserCheck />}
          label="Present Today"
          value={stats?.presentToday}
          color="bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300"
        />
        <StatCard
          icon={<FiUserX />}
          label="Absent Today"
          value={stats?.absentToday}
          color="bg-red-50 text-[#EF5350] dark:bg-red-500/10 dark:text-red-300"
        />
        <StatCard
          icon={<FiCalendar />}
          label="On Leave Today"
          value={stats?.onLeaveToday}
          color="bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300"
        />
        <StatCard
          icon={<FiClock />}
          label="Pending Leave Requests"
          value={stats?.pendingLeaveRequests}
          color="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300"
        />
      </div>

      {/* ================= FILTER BAR ================= */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm p-5 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, employee code, mobile or email..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none transition-all"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-4 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none lg:w-48"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="RESIGNED">Resigned</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          <input
            type="text"
            value={department}
            onChange={(e) => {
              setDepartment(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by department"
            className="px-4 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none lg:w-56"
          />

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 transition"
            >
              <FiX />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ================= ERROR ================= */}

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-[#EF5350] dark:text-red-400 px-5 py-4 flex items-center gap-3">
          <FiAlertCircle className="text-xl flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ================= TABLE ================= */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F3F5EE] dark:bg-[#1D231C] border-b border-[#E7EAE1] dark:border-[#262B24]">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-[#4B5563] dark:text-[#9CA8A0]">
                  Employee
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-[#4B5563] dark:text-[#9CA8A0]">
                  Department / Role
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-[#4B5563] dark:text-[#9CA8A0]">
                  Contact
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-[#4B5563] dark:text-[#9CA8A0]">
                  Joined
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-[#4B5563] dark:text-[#9CA8A0]">
                  Status
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-[#4B5563] dark:text-[#9CA8A0]">
                  Today
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-[#4B5563] dark:text-[#9CA8A0] text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-14 text-center text-[#6B7280] dark:text-[#9CA8A0]"
                  >
                    <div className="w-10 h-10 border-4 border-[#3FA34D] dark:border-[#43B75A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <FiUsers className="mx-auto text-5xl text-[#C7CCC2] dark:text-[#4A5248] mb-4" />
                    <h4 className="text-lg font-semibold text-[#374151] dark:text-[#C3CBC0]">
                      {hasFilters
                        ? "No employees match your filters"
                        : "No employees yet"}
                    </h4>
                    <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">
                      {hasFilters
                        ? "Try clearing your search or filters."
                        : 'Click "Add Employee" above to create your first staff record.'}
                    </p>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-[#F3F5EE] dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] text-white flex items-center justify-center font-semibold flex-shrink-0">
                          {emp.fullName?.charAt(0)?.toUpperCase() || "E"}
                        </div>
                        <div>
                          <Link
                            to={`/employees/${emp.id}`}
                            className="font-semibold text-[#1F2937] dark:text-[#E4E9E2] hover:text-[#3FA34D] dark:hover:text-[#43B75A] transition-colors"
                          >
                            {emp.fullName}
                          </Link>
                          <p className="text-xs text-[#6B7280] dark:text-[#9CA8A0]">
                            {emp.employeeCode}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-[#1F2937] dark:text-[#E4E9E2]">{emp.department}</p>
                      <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{emp.designation}</p>
                    </td>

                    <td className="px-6 py-4">
                      {emp.mobile && (
                        <p className="text-sm text-[#4B5563] dark:text-[#9CA8A0] flex items-center gap-2">
                          <FiPhone className="text-[#9CA3AF] dark:text-[#6B7280]" /> {emp.mobile}
                        </p>
                      )}
                      {emp.email && (
                        <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] flex items-center gap-2 mt-1">
                          <FiMail className="text-[#9CA3AF] dark:text-[#6B7280]" /> {emp.email}
                        </p>
                      )}
                      {!emp.mobile && !emp.email && (
                        <span className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">
                          Not provided
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-sm text-[#4B5563] dark:text-[#9CA8A0]">
                      {emp.joiningDate
                        ? new Date(emp.joiningDate).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "—"}
                    </td>

                    <td className="px-6 py-4">
                      <StatusBadge status={emp.status} />
                    </td>

                    <td className="px-6 py-4">
                      {(() => {
                        const rec = todayAttendance[emp.id];
                        const checkedIn = Boolean(rec?.clockIn);
                        const checkedOut = Boolean(rec?.clockOut);
                        const busy = attendanceActionId === emp.id;

                        return (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                                checkedOut
                                  ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                                  : checkedIn
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                                    : "bg-[#F3F5EE] text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]"
                              }`}
                            >
                              {checkedOut
                                ? "Done"
                                : checkedIn
                                  ? "Working"
                                  : "Not marked"}
                            </span>

                            <button
                              onClick={() => handleQuickCheckIn(emp.id)}
                              disabled={checkedIn || busy}
                              title={
                                checkedIn
                                  ? "Already checked in today"
                                  : "Check in"
                              }
                              className="w-8 h-8 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-center text-[#3FA34D] dark:text-[#43B75A] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            >
                              <FiLogIn size={14} />
                            </button>

                            <button
                              onClick={() => handleQuickCheckOut(emp.id)}
                              disabled={!checkedIn || checkedOut || busy}
                              title={
                                !checkedIn
                                  ? "Check in first"
                                  : checkedOut
                                    ? "Already checked out today"
                                    : "Check out"
                              }
                              className="w-8 h-8 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-center text-[#374151] dark:text-[#C3CBC0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            >
                              <FiLogOut size={14} />
                            </button>
                          </div>
                        );
                      })()}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/employees/${emp.id}`)}
                          title="View profile"
                          className="w-9 h-9 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-center text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 hover:text-[#3FA34D] dark:hover:text-[#43B75A] transition"
                        >
                          <FiEye />
                        </button>

                        <OwnerOnly>
                          <button
                            onClick={() =>
                              navigate(`/employees/${emp.id}/edit`)
                            }
                            title="Edit employee"
                            className="w-9 h-9 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-center text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 hover:text-[#3FA34D] dark:hover:text-[#43B75A] transition"
                          >
                            <FiEdit2 />
                          </button>

                          <button
                            onClick={() => setDeleteTarget(emp)}
                            title="Remove employee"
                            className="w-9 h-9 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-center text-[#4B5563] dark:text-[#9CA8A0] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-[#EF5350] dark:hover:text-red-400 transition"
                          >
                            <FiTrash2 />
                          </button>
                        </OwnerOnly>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION ================= */}

        {!loading && employees.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#E7EAE1] dark:border-[#262B24]">
            <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
              Showing{" "}
              <span className="font-semibold text-[#374151] dark:text-[#C3CBC0]">
                {(page - 1) * limit + 1}
              </span>
              –
              <span className="font-semibold text-[#374151] dark:text-[#C3CBC0]">
                {Math.min(page * limit, total)}
              </span>{" "}
              of <span className="font-semibold text-[#374151] dark:text-[#C3CBC0]">{total}</span>{" "}
              employees
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-center text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <FiChevronLeft />
              </button>

              <span className="text-sm font-medium text-[#374151] dark:text-[#C3CBC0] px-2">
                Page {page} of {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9 h-9 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-center text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= DELETE CONFIRMATION ================= */}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-white dark:bg-[#171C17] rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="w-16 h-16 rounded-full bg-red-50 text-[#EF5350] dark:bg-red-500/10 dark:text-red-300 flex items-center justify-center text-3xl mx-auto">
              <FiTrash2 />
            </div>

            <h3 className="mt-5 text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2] text-center">
              Remove {deleteTarget.fullName}?
            </h3>

            <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0] text-center leading-6">
              This marks the employee as <strong>TERMINATED</strong> and hides
              them from the active list. Their attendance, payroll and activity
              history are kept for records — this cannot be undone from here.
            </p>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#374151] dark:text-[#C3CBC0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 font-semibold transition"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-[#EF5350] dark:bg-red-500 hover:bg-red-600 dark:hover:bg-red-600 disabled:bg-red-300 dark:disabled:bg-red-500/40 text-white font-semibold transition"
              >
                {deleting ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesList;