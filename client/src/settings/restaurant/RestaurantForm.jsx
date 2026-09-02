// ==============================================
// src/settings/restaurant/RestaurantForm.jsx
// Updated with dark/light mode support and improved UX
// ==============================================

import React, { useState } from "react";
import {
  FiUpload,
  FiSave,
} from "react-icons/fi";

const RestaurantForm = () => {
  const [form, setForm] = useState({
    restaurantName: "",
    restaurantType: "Restaurant",
    gst: "",
    fssai: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    openingTime: "09:00",
    closingTime: "22:00",
    currency: "INR",
    logo: "",
    banner: "",
  });

  // ==========================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================================

  const handleImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    const url = URL.createObjectURL(file);

    setForm({
      ...form,
      [e.target.name]: url,
    });
  };

  // ==========================================

  const handleSubmit = (e) => {
    e.preventDefault();

    console.log(form);

    // API Call Later
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ======================================
          LOGO & BANNER
      ====================================== */}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Logo */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
          <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2] mb-5">
            Restaurant Logo
          </h3>

          <label className="border-2 border-dashed border-[#E7EAE1] dark:border-[#262B24] rounded-xl h-44 flex flex-col items-center justify-center cursor-pointer hover:border-[#2563EB] dark:hover:border-[#60A5FA] transition">
            {form.logo ? (
              <img src={form.logo} alt="" className="h-full object-contain" />
            ) : (
              <>
                <FiUpload size={36} className="text-[#9CA3AF] dark:text-[#6B7280]" />

                <p className="mt-3 text-[#6B7280] dark:text-[#9CA8A0]">
                  Click to upload logo
                </p>

                <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280] mt-1">
                  PNG, JPG up to 5MB
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
        </div>

        {/* Banner */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
          <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2] mb-5">
            Cover Banner
          </h3>

          <label className="border-2 border-dashed border-[#E7EAE1] dark:border-[#262B24] rounded-xl h-44 flex flex-col items-center justify-center cursor-pointer hover:border-[#2563EB] dark:hover:border-[#60A5FA] transition">
            {form.banner ? (
              <img
                src={form.banner}
                alt=""
                className="h-full w-full object-cover rounded-xl"
              />
            ) : (
              <>
                <FiUpload size={36} className="text-[#9CA3AF] dark:text-[#6B7280]" />

                <p className="mt-3 text-[#6B7280] dark:text-[#9CA8A0]">
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
        </div>
      </div>

      {/* ======================================
          BASIC INFORMATION
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
        <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-6">
          Basic Information
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Restaurant Name *
            </label>

            <input
              name="restaurantName"
              value={form.restaurantName}
              onChange={handleChange}
              placeholder="e.g. Delicious Bites"
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Restaurant Type
            </label>

            <select
              name="restaurantType"
              value={form.restaurantType}
              onChange={handleChange}
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            >
              <option>Restaurant</option>

              <option>Cafe</option>

              <option>Bakery</option>

              <option>Fast Food</option>

              <option>Cloud Kitchen</option>
            </select>
          </div>
        </div>
      </div>
      {/* ======================================
          BUSINESS INFORMATION
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
        <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-6">
          Business Information
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* GST */}

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              GST Number
            </label>

            <input
              name="gst"
              value={form.gst}
              onChange={handleChange}
              placeholder="e.g. 29ABCDE1234F1Z5"
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              15-character GST identification number
            </p>
          </div>

          {/* FSSAI */}

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              FSSAI License Number
            </label>

            <input
              name="fssai"
              value={form.fssai}
              onChange={handleChange}
              placeholder="e.g. 10013012000345"
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              Food safety license number for your establishment
            </p>
          </div>
        </div>
      </div>

      {/* ======================================
          CONTACT INFORMATION
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
        <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-6">
          Contact Information
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Phone */}

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Phone Number *
            </label>

            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91 9876543210"
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              Main contact number for your restaurant
            </p>
          </div>

          {/* WhatsApp */}

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              WhatsApp Number
            </label>

            <input
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              placeholder="+91 9876543210"
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              For customer notifications and orders
            </p>
          </div>

          {/* Email */}

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Email Address
            </label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="info@restaurant.com"
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              For business inquiries and notifications
            </p>
          </div>

          {/* Website */}

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Website
            </label>

            <input
              type="url"
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://restaurant.com"
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              Your restaurant's online website URL
            </p>
          </div>
        </div>
      </div>

      {/* ======================================
          ADDRESS
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
        <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-6">
          Location Details
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Complete Address *
            </label>

            <textarea
              rows={4}
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Street address, building name, etc."
              className="w-full border border-[#E7EAE1] dark:border-[#262B24] rounded-lg p-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] resize-none focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              Full address shown on bills and maps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                City
              </label>

              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                placeholder="e.g. Bangalore"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                State
              </label>

              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                placeholder="e.g. Karnataka"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Pincode
              </label>

              <input
                name="pincode"
                value={form.pincode}
                onChange={handleChange}
                placeholder="e.g. 560001"
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              />
            </div>
          </div>
        </div>
      </div>
      {/* ======================================
          BUSINESS HOURS
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
        <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-6">
          Operating Hours
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Opening Time
            </label>

            <input
              type="time"
              name="openingTime"
              value={form.openingTime}
              onChange={handleChange}
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              When your restaurant opens each day
            </p>
          </div>

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Closing Time
            </label>

            <input
              type="time"
              name="closingTime"
              value={form.closingTime}
              onChange={handleChange}
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              When your restaurant closes each day
            </p>
          </div>
        </div>
      </div>

      {/* ======================================
          REGIONAL SETTINGS
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
        <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-6">
          Regional Settings
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Currency
            </label>

            <select
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            >
              <option value="INR">Indian Rupee (₹)</option>

              <option value="USD">US Dollar ($)</option>

              <option value="AED">UAE Dirham (AED)</option>
            </select>

            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280] mt-1">
              Currency for all transactions and reports
            </p>
          </div>

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Country
            </label>

            <input
              value="India"
              disabled
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-[#F3F5EE] dark:bg-[#0F1410] text-[#9CA3AF] dark:text-[#6B7280]"
            />
          </div>
        </div>
      </div>

      {/* ======================================
          DEVICE COMPATIBILITY INFO
      ====================================== */}

      <div className="bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
        <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2] mb-3">
          📱 Works on All Devices
        </h3>

        <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
          Your restaurant settings are accessible and fully functional on PCs, laptops, tablets, and smartphones. Access your business anytime, anywhere with complete sync across all devices.
        </p>
      </div>

      {/* ======================================
          ACTION BUTTONS
      ====================================== */}

      <div className="flex justify-end gap-4">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="
            h-12
            px-6
            rounded-lg
            border
            border-[#E7EAE1]
            dark:border-[#262B24]
            text-[#1F2937]
            dark:text-[#E4E9E2]
            hover:bg-[#F3F5EE]
            dark:hover:bg-[#1D231C]
            transition
            font-medium
          "
        >
          Reset
        </button>

        <button
          type="submit"
          className="
            h-12
            px-8
            rounded-lg
            bg-[#2563EB]
            dark:bg-[#60A5FA]
            hover:bg-[#1D4ED8]
            dark:hover:bg-[#3B82F6]
            text-white
            flex
            items-center
            gap-2
            transition
            font-semibold
          "
        >
          <FiSave />
          Save Restaurant
        </button>
      </div>
    </form>
  );
};

export default RestaurantForm;