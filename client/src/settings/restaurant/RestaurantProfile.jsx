// ==============================================
// src/settings/restaurant/RestaurantProfile.jsx
// ==============================================

import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/apiClient";
import {
  FiSave,
  FiRefreshCw,
  FiUpload,
  FiHome,
  FiImage,
  FiFileText,
  FiPhone,
  FiMapPin,
} from "react-icons/fi";

const RESTAURANT_TYPES = [
  "Restaurant",
  "Cafe",
  "Bakery",
  "Fast Food",
  "Food Court",
  "Cloud Kitchen",
  "Bar & Restaurant",
  "Sweet Shop",
];

const RestaurantProfile = () => {
  // ==========================================
  // FORM STATE
  // ==========================================

  // Mirrors EDITABLE_PROFILE_FIELDS in server/src/settings/settings.service.js.
  // `restaurantName` is the form's label for the outlet's `name` column; the
  // mapping happens in toPayload/fromProfile below so the rest of the markup
  // can keep using the friendlier key.
  const EMPTY_FORM = {
    restaurantName: "",
    legalBusinessName: "",
    restaurantType: "Restaurant",
    tagline: "",
    description: "",
    logoUrl: "",
    bannerUrl: "",
    gstNumber: "",
    fssaiNumber: "",
    panNumber: "",
    registrationNumber: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    mobile: "",
    alternateMobile: "",
    email: "",
    website: "",
    whatsapp: "",
    openingTime: "",
    closingTime: "",
    timezone: "Asia/Kolkata",
    defaultLanguage: "en",
    currency: "INR",
    facebookUrl: "",
    instagramUrl: "",
    googleBusinessUrl: "",
    googleMapsUrl: "",
  };

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saved, setSaved] = useState(EMPTY_FORM); // last persisted state, for Reset
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // The server speaks the schema's column names; the form uses its own for a
  // few fields. One conversion each way, in one place.
  function fromProfile(p) {
    return {
      ...EMPTY_FORM,
      ...Object.fromEntries(
        Object.entries(p || {})
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => [k, v]),
      ),
      restaurantName: p?.name || "",
      gstNumber: p?.gstin || "",
      fssaiNumber: p?.fssai || "",
      mobile: p?.phone || "",
    };
  }

  function toPayload(f) {
    const { restaurantName, gstNumber, fssaiNumber, mobile, ...rest } = f;
    return {
      ...rest,
      name: restaurantName,
      gstin: gstNumber,
      fssai: fssaiNumber,
      phone: mobile,
    };
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiRequest("/settings/restaurant-profile");
      if (cancelled) return;
      if (ok) {
        const next = fromProfile(data);
        setFormData(next);
        setSaved(next);
      } else {
        setError(data?.error || data?.message || "Couldn't load the profile.");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setError("");
    setNotice("");
    if (!formData.restaurantName.trim()) {
      setError("Restaurant name is required.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    const { ok, data } = await apiRequest("/settings/restaurant-profile", {
      method: "PUT",
      body: JSON.stringify(toPayload(formData)),
    });
    setSaving(false);
    if (!ok) {
      setError(data?.error || data?.message || "Couldn't save the profile.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const next = fromProfile(data);
    setFormData(next);
    setSaved(next);
    setNotice("Restaurant profile saved.");
  }

  // Reverts to the last PERSISTED values, not to blank — a Reset that wiped
  // the form would be a trap next to a Save button.
  function handleReset() {
    setFormData(saved);
    setError("");
    setNotice("");
  }

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==========================================
  // IMAGE CHANGE
  // ==========================================

  // Logo/banner preview only.
  //
  // URL.createObjectURL produces a blob: URL that lives in THIS tab and dies
  // on reload, so it must never be persisted — a saved blob: URL would look
  // fine until the page refreshed and then 404 forever. Saving these properly
  // needs the file uploaded to R2 first (server/src/config/r2.js) and the
  // returned public URL stored in logoUrl/bannerUrl, which isn't wired up
  // yet. Until then the picker previews the image without claiming to save
  // it, and logoUrl/bannerUrl are only settable directly.
  const [imagePreview, setImagePreview] = useState({ logo: null, banner: null });

  const handleImage = (e) => {
    const { name, files } = e.target;

    if (!files.length) return;

    setImagePreview((prev) => ({
      ...prev,
      [name]: URL.createObjectURL(files[0]),
    }));
    setNotice("");
    setError(
      "Image previews aren't saved yet — file upload isn't wired up. Everything else on this page saves normally.",
    );
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center text-white">
              <FiHome size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-gray-800">
                Restaurant Profile
              </h1>

              <p className="text-gray-500 mt-2">
                Manage your restaurant identity and branding.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || loading}
              className="
                h-12
                px-6
                rounded-xl
                border
                border-gray-300
                hover:bg-gray-100
                flex
                items-center
                gap-2
                disabled:opacity-50
              "
            >
              <FiRefreshCw />
              Reset
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="
                h-12
                px-8
                rounded-xl
                bg-blue-600
                hover:bg-blue-700
                text-white
                flex
                items-center
                gap-2
                disabled:opacity-60
              "
            >
              <FiSave />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* ======================================
          CONTENT
      ====================================== */}

      <div className="max-w-7xl mx-auto p-8">
        {/* ======================================
            BASIC INFORMATION
        ====================================== */}

        <div className="bg-white rounded-3xl border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-8">
            <FiFileText className="text-blue-600" size={26} />

            <h2 className="text-2xl font-bold">Basic Information</h2>
          </div>

          {/* ======================================
              LOGO & BANNER
          ====================================== */}

          <div className="grid lg:grid-cols-2 gap-8 mb-10">
            {/* Logo */}

            <div>
              <label className="font-semibold text-gray-700 block mb-4">
                Restaurant Logo
              </label>

              <label
                className="
                  border-2
                  border-dashed
                  border-gray-300
                  rounded-2xl
                  h-52
                  flex
                  flex-col
                  items-center
                  justify-center
                  cursor-pointer
                  hover:border-blue-500
                  transition
                "
              >
                {(imagePreview.logo || formData.logoUrl) ? (
                  <img
                    src={imagePreview.logo || formData.logoUrl}
                    alt="Logo"
                    className="h-full w-full object-contain rounded-2xl"
                  />
                ) : (
                  <>
                    <FiUpload size={42} className="text-gray-400" />

                    <p className="mt-4 text-gray-500">Upload Restaurant Logo</p>
                  </>
                )}

                <input
                  type="file"
                  hidden
                  name="logo"
                  accept="image/*"
                  onChange={handleImage}
                />
              </label>
            </div>

            {/* Banner */}

            <div>
              <label className="font-semibold text-gray-700 block mb-4">
                Cover Banner
              </label>

              <label
                className="
                  border-2
                  border-dashed
                  border-gray-300
                  rounded-2xl
                  h-52
                  flex
                  flex-col
                  items-center
                  justify-center
                  cursor-pointer
                  hover:border-blue-500
                  transition
                "
              >
                {(imagePreview.banner || formData.bannerUrl) ? (
                  <img
                    src={imagePreview.banner || formData.bannerUrl}
                    alt="Banner"
                    className="h-full w-full object-cover rounded-2xl"
                  />
                ) : (
                  <>
                    <FiImage size={42} className="text-gray-400" />

                    <p className="mt-4 text-gray-500">Upload Cover Banner</p>
                  </>
                )}

                <input
                  type="file"
                  hidden
                  name="banner"
                  accept="image/*"
                  onChange={handleImage}
                />
              </label>
            </div>
          </div>

          {/* ======================================
              BASIC FIELDS
          ====================================== */}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Restaurant Name */}

            <div>
              <label className="block mb-3 font-semibold">
                Restaurant Name *
              </label>

              <input
                type="text"
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleChange}
                placeholder="Enter restaurant name"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Legal Name */}

            <div>
              <label className="block mb-3 font-semibold">
                Legal Business Name
              </label>

              <input
                type="text"
                name="legalBusinessName"
                value={formData.legalBusinessName}
                onChange={handleChange}
                placeholder="Enter legal business name"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>
            {/* Restaurant Type */}

            <div>
              <label className="block mb-3 font-semibold">
                Restaurant Type
              </label>

              <select
                name="restaurantType"
                value={formData.restaurantType}
                onChange={handleChange}
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              >
                {RESTAURANT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Tagline */}

            <div>
              <label className="block mb-3 font-semibold">Tagline</label>

              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                placeholder="Fresh Food, Happy People"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Description */}

          <div className="mt-8">
            <label className="block mb-3 font-semibold">
              Restaurant Description
            </label>

            <textarea
              rows={5}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Write a short description about your restaurant..."
              className="w-full rounded-2xl border border-gray-300 p-4 resize-none focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        {/* ======================================
            BUSINESS INFORMATION
        ====================================== */}

        <div className="bg-white rounded-3xl border border-gray-200 p-8 mt-8">
          <div className="flex items-center gap-3 mb-8">
            <FiFileText className="text-green-600" size={26} />

            <h2 className="text-2xl font-bold">Business Information</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* GST */}

            <div>
              <label className="block mb-3 font-semibold">GST Number</label>

              <input
                type="text"
                name="gstNumber"
              value={formData.gstNumber}
              onChange={handleChange}
                placeholder="29ABCDE1234F1Z5"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>

            {/* FSSAI */}

            <div>
              <label className="block mb-3 font-semibold">
                FSSAI License Number
              </label>

              <input
                type="text"
                name="fssaiNumber"
              value={formData.fssaiNumber}
              onChange={handleChange}
                placeholder="Enter FSSAI License"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>

            {/* PAN */}

            <div>
              <label className="block mb-3 font-semibold">PAN Number</label>

              <input
                type="text"
                name="panNumber"
              value={formData.panNumber}
              onChange={handleChange}
                placeholder="ABCDE1234F"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Business Registration */}

            <div>
              <label className="block mb-3 font-semibold">
                Business Registration Number
              </label>

              <input
                type="text"
                name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
                placeholder="Enter Registration Number"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
        {/* ======================================
            CONTACT INFORMATION
        ====================================== */}

        <div className="bg-white rounded-3xl border border-gray-200 p-8 mt-8">
          <div className="flex items-center gap-3 mb-8">
            <FiPhone className="text-indigo-600" size={26} />

            <h2 className="text-2xl font-bold">Contact Information</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Mobile */}

            <div>
              <label className="block mb-3 font-semibold">
                Mobile Number *
              </label>

              <input
                type="tel"
                name="mobile"
              value={formData.mobile}
              onChange={handleChange}
                placeholder="+91 9876543210"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Alternate */}

            <div>
              <label className="block mb-3 font-semibold">
                Alternate Mobile
              </label>

              <input
                type="tel"
                name="alternateMobile"
              value={formData.alternateMobile}
              onChange={handleChange}
                placeholder="+91 9876543210"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>

            {/* WhatsApp */}

            <div>
              <label className="block mb-3 font-semibold">
                WhatsApp Number
              </label>

              <input
                type="tel"
                name="whatsapp"
              value={formData.whatsapp}
              onChange={handleChange}
                placeholder="+91 9876543210"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Email */}

            <div>
              <label className="block mb-3 font-semibold">Email Address</label>

              <input
                type="email"
                name="email"
              value={formData.email}
              onChange={handleChange}
                placeholder="info@restaurant.com"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Website */}

            <div className="md:col-span-2">
              <label className="block mb-3 font-semibold">Website</label>

              <input
                type="url"
                name="website"
              value={formData.website}
              onChange={handleChange}
                placeholder="https://www.restaurant.com"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            ADDRESS
        ====================================== */}

        <div className="bg-white rounded-3xl border border-gray-200 p-8 mt-8">
          <div className="flex items-center gap-3 mb-8">
            <FiMapPin className="text-red-600" size={26} />

            <h2 className="text-2xl font-bold">Restaurant Address</h2>
          </div>

          <div className="space-y-8">
            {/* Address */}

            <div>
              <label className="block mb-3 font-semibold">Address</label>

              <textarea
                rows={4}
                name="address"
              value={formData.address}
              onChange={handleChange}
                placeholder="Enter complete restaurant address"
                className="w-full rounded-2xl border border-gray-300 p-4 resize-none focus:border-blue-500 outline-none"
              />
            </div>

            {/* Location */}

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* City */}

              <div>
                <label className="block mb-3 font-semibold">City</label>

                <input
                  type="text"
                  name="city"
              value={formData.city}
              onChange={handleChange}
                  placeholder="Bangalore"
                  className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
                />
              </div>

              {/* State */}

              <div>
                <label className="block mb-3 font-semibold">State</label>

                <input
                  type="text"
                  name="state"
              value={formData.state}
              onChange={handleChange}
                  placeholder="Karnataka"
                  className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Country */}

              <div>
                <label className="block mb-3 font-semibold">Country</label>

                <input
                  type="text"
                  name="country"
              value={formData.country}
              onChange={handleChange}
                  defaultValue="India"
                  className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Pincode */}

              <div>
                <label className="block mb-3 font-semibold">Pincode</label>

                <input
                  type="text"
                  name="pincode"
              value={formData.pincode}
              onChange={handleChange}
                  placeholder="560001"
                  className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
        {/* ======================================
            BUSINESS HOURS
        ====================================== */}

        <div className="bg-white rounded-3xl border border-gray-200 p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Business Hours</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block mb-3 font-semibold">Opening Time</label>

              <input
                type="time"
                name="openingTime"
              value={formData.openingTime}
              onChange={handleChange}
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold">Closing Time</label>

              <input
                type="time"
                name="closingTime"
              value={formData.closingTime}
              onChange={handleChange}
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            REGIONAL SETTINGS
        ====================================== */}

        <div className="bg-white rounded-3xl border border-gray-200 p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Regional Settings</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <label className="block mb-3 font-semibold">Currency</label>

              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full h-14 rounded-xl border border-gray-300 px-4"
              >
                {/* Values are the stored codes, not the display labels — the
                    options previously had no value at all, so even a bound
                    select would have saved "Indian Rupee (₹)". */}
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="AED">UAE Dirham (AED)</option>
              </select>
            </div>

            <div>
              <label className="block mb-3 font-semibold">Time Zone</label>

              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full h-14 rounded-xl border border-gray-300 px-4"
              >
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <label className="block mb-3 font-semibold">Language</label>

              <select
                name="defaultLanguage"
                value={formData.defaultLanguage}
                onChange={handleChange}
                className="w-full h-14 rounded-xl border border-gray-300 px-4"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="kn">Kannada</option>
              </select>
            </div>
          </div>
        </div>

        {/* ======================================
            SOCIAL MEDIA
        ====================================== */}

        <div className="bg-white rounded-3xl border border-gray-200 p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Social Media</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <input
              type="url"
              name="facebookUrl"
              value={formData.facebookUrl}
              onChange={handleChange}
              placeholder="Facebook URL"
              className="h-14 rounded-xl border border-gray-300 px-4"
            />

            <input
              type="url"
              name="instagramUrl"
              value={formData.instagramUrl}
              onChange={handleChange}
              placeholder="Instagram URL"
              className="h-14 rounded-xl border border-gray-300 px-4"
            />

            <input
              type="url"
              name="googleBusinessUrl"
              value={formData.googleBusinessUrl}
              onChange={handleChange}
              placeholder="Google Business Profile"
              className="h-14 rounded-xl border border-gray-300 px-4"
            />

            <input
              type="url"
              name="googleMapsUrl"
              value={formData.googleMapsUrl}
              onChange={handleChange}
              placeholder="Google Maps URL"
              className="h-14 rounded-xl border border-gray-300 px-4"
            />
          </div>
        </div>

        {/* ======================================
            SAVE
        ====================================== */}

        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
            {notice}
          </div>
        )}

        <div className="flex justify-end gap-4 mt-10 mb-10">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || loading}
            className="
              h-14
              px-8
              rounded-xl
              border
              border-gray-300
              hover:bg-gray-100
              font-semibold
              disabled:opacity-50
            "
          >
            Reset
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="
              h-14
              px-10
              rounded-xl
              bg-blue-600
              hover:bg-blue-700
              text-white
              font-semibold
              flex
              items-center
              gap-3
              disabled:opacity-60
            "
          >
            <FiSave />
            {saving ? "Saving…" : "Save Restaurant Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfile;