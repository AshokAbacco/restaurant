// ==============================================
// src/settings/restaurant/RestaurantProfile.jsx
// ==============================================

import React, { useState } from "react";
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

  const [formData, setFormData] = useState({
    restaurantName: "",
    legalBusinessName: "",
    restaurantType: "Restaurant",
    tagline: "",
    description: "",
    logo: null,
    banner: null,
  });

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

  const handleImage = (e) => {
    const { name, files } = e.target;

    if (!files.length) return;

    setFormData((prev) => ({
      ...prev,
      [name]: URL.createObjectURL(files[0]),
    }));
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
              "
            >
              <FiRefreshCw />
              Reset
            </button>

            <button
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
              "
            >
              <FiSave />
              Save Changes
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
                {formData.logo ? (
                  <img
                    src={formData.logo}
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
                {formData.banner ? (
                  <img
                    src={formData.banner}
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
                className="w-full h-14 rounded-xl border border-gray-300 px-4 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block mb-3 font-semibold">Closing Time</label>

              <input
                type="time"
                name="closingTime"
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

              <select className="w-full h-14 rounded-xl border border-gray-300 px-4">
                <option>Indian Rupee (₹)</option>

                <option>US Dollar ($)</option>

                <option>UAE Dirham (AED)</option>
              </select>
            </div>

            <div>
              <label className="block mb-3 font-semibold">Time Zone</label>

              <select className="w-full h-14 rounded-xl border border-gray-300 px-4">
                <option>Asia/Kolkata</option>

                <option>UTC</option>
              </select>
            </div>

            <div>
              <label className="block mb-3 font-semibold">Language</label>

              <select className="w-full h-14 rounded-xl border border-gray-300 px-4">
                <option>English</option>

                <option>Hindi</option>

                <option>Kannada</option>
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
              placeholder="Facebook URL"
              className="h-14 rounded-xl border border-gray-300 px-4"
            />

            <input
              type="url"
              placeholder="Instagram URL"
              className="h-14 rounded-xl border border-gray-300 px-4"
            />

            <input
              type="url"
              placeholder="Google Business Profile"
              className="h-14 rounded-xl border border-gray-300 px-4"
            />

            <input
              type="url"
              placeholder="Google Maps URL"
              className="h-14 rounded-xl border border-gray-300 px-4"
            />
          </div>
        </div>

        {/* ======================================
            SAVE
        ====================================== */}

        <div className="flex justify-end gap-4 mt-10 mb-10">
          <button
            className="
              h-14
              px-8
              rounded-xl
              border
              border-gray-300
              hover:bg-gray-100
              font-semibold
            "
          >
            Reset
          </button>

          <button
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
            "
          >
            <FiSave />
            Save Restaurant Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfile;
