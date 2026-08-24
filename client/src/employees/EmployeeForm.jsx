// ==============================================
// client/src/employees/EmployeeForm.jsx
// Used for both /employees/new and /employees/:id/edit
// ==============================================

import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  FiUserPlus,
  FiSave,
  FiArrowLeft,
  FiInfo,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

import PageHeader from "../components/layout/PageHeader";
import employeesService from "./employeesService";

// ==========================================
// SUGGESTIONS (free-text fields with hints)
// ==========================================

const DEPARTMENT_SUGGESTIONS = [
  "Kitchen",
  "Service",
  "Inventory",
  "Management",
  "Delivery",
  "Housekeeping",
];

const DESIGNATION_SUGGESTIONS = [
  "Head Chef",
  "Chef",
  "Waiter",
  "Cashier",
  "Manager",
  "Store Keeper",
  "Delivery Rider",
  "Cleaner",
];

const EMPTY_FORM = {
  fullName: "",
  gender: "",
  dob: "",
  mobile: "",
  email: "",
  emergencyContact: "",
  department: "",
  designation: "",
  joiningDate: "",
  employmentType: "",
  status: "ACTIVE",
  address: {
    houseNo: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  },
};

const EmployeeForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ==========================================
  // LOAD EXISTING EMPLOYEE (edit mode)
  // ==========================================

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      const result = await employeesService.getEmployee(id);

      if (!result.success) {
        setFormError(result.message);
        setLoading(false);
        return;
      }

      const emp = result.data;

      setFormData({
        fullName: emp.fullName || "",
        gender: emp.gender || "",
        dob: emp.dob ? emp.dob.substring(0, 10) : "",
        mobile: emp.mobile || "",
        email: emp.email || "",
        emergencyContact: emp.emergencyContact || "",
        department: emp.department || "",
        designation: emp.designation || "",
        joiningDate: emp.joiningDate ? emp.joiningDate.substring(0, 10) : "",
        employmentType: emp.employmentType || "",
        status: emp.status || "ACTIVE",
        address: {
          houseNo: emp.address?.houseNo || "",
          street: emp.address?.street || "",
          city: emp.address?.city || "",
          state: emp.address?.state || "",
          pincode: emp.address?.pincode || "",
        },
      });

      setLoading(false);
    })();
  }, [id, isEdit]);

  // ==========================================
  // HANDLERS
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [name]: value },
    }));
  };

  // ==========================================
  // VALIDATION
  // ==========================================

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.department.trim())
      newErrors.department = "Department is required";
    if (!formData.designation.trim())
      newErrors.designation = "Designation is required";
    if (!formData.joiningDate)
      newErrors.joiningDate = "Joining date is required";

    if (formData.mobile && !/^[0-9+\-\s()]{7,15}$/.test(formData.mobile)) {
      newErrors.mobile = "Enter a valid phone number";
    }

    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (
      formData.address.pincode &&
      !/^[0-9]{4,10}$/.test(formData.address.pincode)
    ) {
      newErrors.pincode = "Enter a valid pincode";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!validate()) {
      setFormError("Please fix the highlighted fields before saving.");
      return;
    }

    setSaving(true);

    // Only send an address object if at least one field was filled
    const addressFilled = Object.values(formData.address).some((v) => v.trim());

    const payload = {
      fullName: formData.fullName.trim(),
      gender: formData.gender || null,
      dob: formData.dob || null,
      mobile: formData.mobile || null,
      email: formData.email || null,
      emergencyContact: formData.emergencyContact || null,
      department: formData.department.trim(),
      designation: formData.designation.trim(),
      joiningDate: formData.joiningDate,
      employmentType: formData.employmentType || null,
      status: formData.status,
      ...(addressFilled ? { address: formData.address } : {}),
    };

    const result = isEdit
      ? await employeesService.updateEmployee(id, payload)
      : await employeesService.createEmployee(payload);

    setSaving(false);

    if (!result.success) {
      setFormError(result.message);
      return;
    }

    navigate(`/employees/${result.data.id}`, { replace: true });
  };

  // ==========================================
  // LOADING STATE
  // ==========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? "Edit Employee" : "Add Employee"}
        subtitle={
          isEdit
            ? "Update this employee's personal, contact and employment details."
            : "Fill in the details below to create a new staff record. Fields marked * are required."
        }
        icon={<FiUserPlus />}
        action={
          <Link
            to={isEdit ? `/employees/${id}` : "/employees"}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold transition"
          >
            <FiArrowLeft />
            Cancel
          </Link>
        }
      />

      {formError && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 text-red-600 px-5 py-4 flex items-center gap-3">
          <FiAlertCircle className="text-xl flex-shrink-0" />
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ================= PERSONAL INFO ================= */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            Personal Information
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Basic details used to identify this employee across the system.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="e.g. Ramesh Kumar"
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                  errors.fullName
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-600"
                }`}
              />
              {errors.fullName && (
                <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 outline-none bg-white"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 outline-none"
              />
            </div>
          </div>
        </section>

        {/* ================= CONTACT INFO ================= */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            Contact Details
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            How to reach this employee. Email must be unique if you plan to
            create a login account later.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mobile Number
              </label>
              <input
                type="text"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="e.g. 98765 43210"
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                  errors.mobile
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-600"
                }`}
              />
              {errors.mobile && (
                <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. ramesh@restaurant.com"
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                  errors.email
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-600"
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Emergency Contact
              </label>
              <input
                type="text"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="Name and phone number"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 outline-none"
              />
            </div>
          </div>
        </section>

        {/* ================= EMPLOYMENT INFO ================= */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            Employment Details
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Department and designation are free text so you can describe roles
            exactly as they work in your restaurant — pick a suggestion or type
            your own.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Department *
              </label>
              <input
                type="text"
                name="department"
                list="department-suggestions"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g. Kitchen"
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                  errors.department
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-600"
                }`}
              />
              <datalist id="department-suggestions">
                {DEPARTMENT_SUGGESTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              {errors.department && (
                <p className="text-red-500 text-sm mt-1">{errors.department}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Designation *
              </label>
              <input
                type="text"
                name="designation"
                list="designation-suggestions"
                value={formData.designation}
                onChange={handleChange}
                placeholder="e.g. Head Chef"
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                  errors.designation
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-600"
                }`}
              />
              <datalist id="designation-suggestions">
                {DESIGNATION_SUGGESTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
              {errors.designation && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.designation}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Joining Date *
              </label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                  errors.joiningDate
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-600"
                }`}
              />
              {errors.joiningDate && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.joiningDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Employment Type
              </label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 outline-none bg-white"
              >
                <option value="">Select type</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 outline-none bg-white"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
              </select>
            </div>
          </div>
        </section>

        {/* ================= ADDRESS (OPTIONAL) ================= */}

        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            Address (Optional)
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Leave these blank if you don't need to store a home address right
            now — you can always add it later by editing the employee.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                House / Flat No.
              </label>
              <input
                type="text"
                name="houseNo"
                value={formData.address.houseNo}
                onChange={handleAddressChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Street
              </label>
              <input
                type="text"
                name="street"
                value={formData.address.street}
                onChange={handleAddressChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.address.city}
                onChange={handleAddressChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.address.state}
                onChange={handleAddressChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.address.pincode}
                onChange={handleAddressChange}
                className={`w-full px-4 py-3 rounded-xl border outline-none transition-all ${
                  errors.pincode
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-600"
                }`}
              />
              {errors.pincode && (
                <p className="text-red-500 text-sm mt-1">{errors.pincode}</p>
              )}
            </div>
          </div>
        </section>

        {/* ================= TIP ================= */}

        <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 flex gap-4">
          <FiInfo className="text-blue-600 text-xl flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700 leading-6">
            <strong>Good to know:</strong> An employee code (e.g. EMP-0001) is
            generated automatically when you save. A login account for the
            POS/dashboard is optional and can be created afterwards from the
            employee's profile page.
          </div>
        </div>

        {/* ================= SUBMIT ================= */}

        <div className="flex justify-end gap-3">
          <Link
            to={isEdit ? `/employees/${id}` : "/employees"}
            className="px-6 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                    opacity="0.25"
                  />
                  <path
                    d="M22 12a10 10 0 00-10-10"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <FiSave />
                {isEdit ? "Save Changes" : "Create Employee"}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;