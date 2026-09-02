// ==============================================
// src/settings/restaurant/RestaurantProfile.jsx
// Updated with dark/light mode support and improved UX
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
  const [saved, setSaved] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
    setNotice("Your restaurant profile has been updated successfully.");
  }

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
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#2563EB] dark:bg-[#60A5FA] flex items-center justify-center text-white">
              <FiHome size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                Restaurant Profile
              </h1>

              <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                Manage your restaurant identity, branding, and business details. Accessible on all devices.
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
                border-[#E7EAE1]
                dark:border-[#262B24]
                text-[#1F2937]
                dark:text-[#E4E9E2]
                hover:bg-[#F3F5EE]
                dark:hover:bg-[#1D231C]
                flex
                items-center
                gap-2
                disabled:opacity-50
                transition
                font-medium
              "
            >
              <FiRefreshCw size={18} />
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
                bg-[#2563EB]
                dark:bg-[#60A5FA]
                hover:bg-[#1D4ED8]
                dark:hover:bg-[#3B82F6]
                text-white
                flex
                items-center
                gap-2
                disabled:opacity-50
                transition
                font-semibold
              "
            >
              <FiSave size={18} />
              {saving ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* Messages */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-5 py-4 text-sm font-medium text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {notice && (
          <div className="mb-6 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-5 py-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            {notice}
          </div>
        )}

        {/* ======================================
            BRANDING
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-8">
            Branding & Logo
          </h2>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Logo */}

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Restaurant Logo
              </label>

              <label className="border-2 border-dashed border-[#E7EAE1] dark:border-[#262B24] rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:border-[#2563EB] dark:hover:border-[#60A5FA] transition">
                {imagePreview.logo || formData.logoUrl ? (
                  <img
                    src={imagePreview.logo || formData.logoUrl}
                    alt=""
                    className="h-full object-contain"
                  />
                ) : (
                  <>
                    <FiUpload size={40} className="text-[#9CA3AF] dark:text-[#6B7280]" />

                    <p className="mt-3 font-medium text-[#6B7280] dark:text-[#9CA8A0]">
                      Click to upload logo
                    </p>

                    <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280] mt-1">
                      PNG or JPG, max 5MB
                    </p>
                  </>
                )}

                <input
                  hidden
                  type="file"
                  name="logo"
                  accept="image/*"
                  onChange={handleImage}
                />
              </label>

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-3">
                Your restaurant logo shown in the app and documents
              </p>
            </div>

            {/* Banner */}

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Cover Banner
              </label>

              <label className="border-2 border-dashed border-[#E7EAE1] dark:border-[#262B24] rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:border-[#2563EB] dark:hover:border-[#60A5FA] transition">
                {imagePreview.banner || formData.bannerUrl ? (
                  <img
                    src={imagePreview.banner || formData.bannerUrl}
                    alt=""
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : (
                  <>
                    <FiUpload size={40} className="text-[#9CA3AF] dark:text-[#6B7280]" />

                    <p className="mt-3 font-medium text-[#6B7280] dark:text-[#9CA8A0]">
                      Click to upload banner
                    </p>

                    <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280] mt-1">
                      Recommended: 1200x400px
                    </p>
                  </>
                )}

                <input
                  hidden
                  type="file"
                  name="banner"
                  accept="image/*"
                  onChange={handleImage}
                />
              </label>

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-3">
                Displayed on your online ordering and customer portal
              </p>
            </div>
          </div>
        </div>

        {/* ======================================
            BASIC INFORMATION
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-8">
            Basic Information
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Restaurant Name *
              </label>

              <input
                type="text"
                name="restaurantName"
                value={formData.restaurantName}
                onChange={handleChange}
                placeholder="e.g. Delicious Bites"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Restaurant Type
              </label>

              <select
                name="restaurantType"
                value={formData.restaurantType}
                onChange={handleChange}
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              >
                {RESTAURANT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Legal Business Name
              </label>

              <input
                type="text"
                name="legalBusinessName"
                value={formData.legalBusinessName}
                onChange={handleChange}
                placeholder="As per GST registration"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Tagline
              </label>

              <input
                type="text"
                name="tagline"
                value={formData.tagline}
                onChange={handleChange}
                placeholder="e.g. Flavors of India"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>
          </div>

          <div>
            <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
              Description
            </label>

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Tell customers about your restaurant, cuisine, specialty, etc."
              rows={4}
              className="w-full rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] resize-none focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />
          </div>
        </div>

        {/* ======================================
            BUSINESS INFORMATION
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-8">
            Business Information
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                GST Number
              </label>

              <input
                type="text"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                placeholder="29ABCDE1234F1Z5"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-2">
                15-character GST identification number
              </p>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                FSSAI License
              </label>

              <input
                type="text"
                name="fssaiNumber"
                value={formData.fssaiNumber}
                onChange={handleChange}
                placeholder="10013012000345"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-2">
                Food safety license number for your establishment
              </p>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                PAN Number
              </label>

              <input
                type="text"
                name="panNumber"
                value={formData.panNumber}
                onChange={handleChange}
                placeholder="ABCDE1234F"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Registration Number
              </label>

              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="Registration number if applicable"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            CONTACT INFORMATION
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-8">
            Contact Information
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Primary Mobile
              </label>

              <input
                type="tel"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                placeholder="+91 9876543210"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-2">
                Main contact number for your restaurant
              </p>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Alternate Mobile
              </label>

              <input
                type="tel"
                name="alternateMobile"
                value={formData.alternateMobile}
                onChange={handleChange}
                placeholder="+91 9876543210"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Email Address
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="info@restaurant.com"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-2">
                For business inquiries and notifications
              </p>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                WhatsApp Number
              </label>

              <input
                type="tel"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                placeholder="+91 9876543210"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-2">
                For customer notifications and orders
              </p>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Website
              </label>

              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://restaurant.com"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-2">
                Your restaurant's online website URL
              </p>
            </div>
          </div>
        </div>

        {/* ======================================
            ADDRESS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-8">
            Location Details
          </h2>

          <div className="space-y-8">
            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Complete Address
              </label>

              <textarea
                rows={4}
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address, building name, etc."
                className="w-full rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] resize-none focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-2">
                Full address shown on bills, invoices, and maps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  City
                </label>

                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Bangalore"
                  className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
                />
              </div>

              <div>
                <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  State
                </label>

                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Karnataka"
                  className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
                />
              </div>

              <div>
                <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  Pincode
                </label>

                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="560001"
                  className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
                />
              </div>

              <div>
                <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  Country
                </label>

                <input
                  type="text"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-[#F3F5EE] dark:bg-[#0F1410] text-[#9CA3AF] dark:text-[#6B7280]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================
            BUSINESS HOURS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-8">
            Operating Hours
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Opening Time
              </label>

              <input
                type="time"
                name="openingTime"
                value={formData.openingTime}
                onChange={handleChange}
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-2">
                When your restaurant opens each day
              </p>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Closing Time
              </label>

              <input
                type="time"
                name="closingTime"
                value={formData.closingTime}
                onChange={handleChange}
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-2">
                When your restaurant closes each day
              </p>
            </div>
          </div>
        </div>

        {/* ======================================
            REGIONAL SETTINGS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-8">
            Regional Settings
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Currency
              </label>

              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              >
                <option value="INR">Indian Rupee (₹)</option>

                <option value="USD">US Dollar ($)</option>

                <option value="AED">UAE Dirham (AED)</option>
              </select>

              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-2">
                Currency for all transactions and reports
              </p>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Time Zone
              </label>

              <select
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>

                <option value="UTC">UTC</option>
              </select>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Language
              </label>

              <select
                name="defaultLanguage"
                value={formData.defaultLanguage}
                onChange={handleChange}
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
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

        <div className="bg-white dark:bg-[#171C17] rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mb-8">
          <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-8">
            Social Media & Links
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Facebook URL
              </label>

              <input
                type="url"
                name="facebookUrl"
                value={formData.facebookUrl}
                onChange={handleChange}
                placeholder="https://facebook.com/yourpage"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Instagram URL
              </label>

              <input
                type="url"
                name="instagramUrl"
                value={formData.instagramUrl}
                onChange={handleChange}
                placeholder="https://instagram.com/yourprofile"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Google Business Profile
              </label>

              <input
                type="url"
                name="googleBusinessUrl"
                value={formData.googleBusinessUrl}
                onChange={handleChange}
                placeholder="Your Google Business URL"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Google Maps URL
              </label>

              <input
                type="url"
                name="googleMapsUrl"
                value={formData.googleMapsUrl}
                onChange={handleChange}
                placeholder="Your Google Maps location link"
                className="w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>
          </div>
        </div>

        {/* ======================================
            DEVICE COMPATIBILITY INFO
        ====================================== */}

        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-3xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mb-8">
          <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2] mb-3">
            📱 Works on All Your Devices
          </h3>

          <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
            Your restaurant profile and all settings sync seamlessly across PCs, laptops, tablets, and smartphones. Update your information from anywhere and access it instantly on all devices. Your data is always up to date.
          </p>
        </div>

        {/* ======================================
            ACTION BUTTONS
        ====================================== */}

        <div className="flex justify-end gap-4 mb-10">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || loading}
            className="
              h-14
              px-8
              rounded-xl
              border
              border-[#E7EAE1]
              dark:border-[#262B24]
              text-[#1F2937]
              dark:text-[#E4E9E2]
              hover:bg-[#F3F5EE]
              dark:hover:bg-[#1D231C]
              font-semibold
              disabled:opacity-50
              transition
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
              bg-[#2563EB]
              dark:bg-[#60A5FA]
              hover:bg-[#1D4ED8]
              dark:hover:bg-[#3B82F6]
              text-white
              font-semibold
              flex
              items-center
              gap-3
              disabled:opacity-60
              transition
            "
          >
            <FiSave size={18} />
            {saving ? "Saving…" : "Save Restaurant Profile"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfile;