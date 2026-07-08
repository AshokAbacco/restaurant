// ==============================================
// src/settings/restaurant/RestaurantForm.jsx
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

        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-5">Restaurant Logo</h3>

          <label className="border-2 border-dashed rounded-xl h-44 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition">
            {form.logo ? (
              <img src={form.logo} alt="" className="h-full object-contain" />
            ) : (
              <>
                <FiUpload size={36} />

                <p className="mt-3">Upload Logo</p>
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

        <div className="bg-white rounded-2xl border p-6">
          <h3 className="font-semibold mb-5">Cover Banner</h3>

          <label className="border-2 border-dashed rounded-xl h-44 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition">
            {form.banner ? (
              <img
                src={form.banner}
                alt=""
                className="h-full w-full object-cover rounded-xl"
              />
            ) : (
              <>
                <FiUpload size={36} />

                <p className="mt-3">Upload Banner</p>
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

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Basic Information</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2">Restaurant Name</label>

            <input
              name="restaurantName"
              value={form.restaurantName}
              onChange={handleChange}
              className="w-full h-12 border rounded-lg px-4"
            />
          </div>

          <div>
            <label className="block mb-2">Restaurant Type</label>

            <select
              name="restaurantType"
              value={form.restaurantType}
              onChange={handleChange}
              className="w-full h-12 border rounded-lg px-4"
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

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Business Information</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* GST */}

          <div>
            <label className="block mb-2">GST Number</label>

            <input
              name="gst"
              value={form.gst}
              onChange={handleChange}
              placeholder="29ABCDE1234F1Z5"
              className="w-full h-12 border rounded-lg px-4"
            />
          </div>

          {/* FSSAI */}

          <div>
            <label className="block mb-2">FSSAI License</label>

            <input
              name="fssai"
              value={form.fssai}
              onChange={handleChange}
              placeholder="Enter FSSAI Number"
              className="w-full h-12 border rounded-lg px-4"
            />
          </div>
        </div>
      </div>

      {/* ======================================
          CONTACT INFORMATION
      ====================================== */}

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Contact Information</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Phone */}

          <div>
            <label className="block mb-2">Phone Number</label>

            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91 9876543210"
              className="w-full h-12 border rounded-lg px-4"
            />
          </div>

          {/* WhatsApp */}

          <div>
            <label className="block mb-2">WhatsApp Number</label>

            <input
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              placeholder="+91 9876543210"
              className="w-full h-12 border rounded-lg px-4"
            />
          </div>

          {/* Email */}

          <div>
            <label className="block mb-2">Email Address</label>

            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="info@restaurant.com"
              className="w-full h-12 border rounded-lg px-4"
            />
          </div>

          {/* Website */}

          <div>
            <label className="block mb-2">Website</label>

            <input
              type="url"
              name="website"
              value={form.website}
              onChange={handleChange}
              placeholder="https://restaurant.com"
              className="w-full h-12 border rounded-lg px-4"
            />
          </div>
        </div>
      </div>

      {/* ======================================
          ADDRESS
      ====================================== */}

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Address</h2>

        <div className="space-y-6">
          <div>
            <label className="block mb-2">Restaurant Address</label>

            <textarea
              rows={4}
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Enter complete address"
              className="w-full border rounded-lg p-4 resize-none"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block mb-2">City</label>

              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2">State</label>

              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2">Pincode</label>

              <input
                name="pincode"
                value={form.pincode}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>
          </div>
        </div>
      </div>
      {/* ======================================
          BUSINESS HOURS
      ====================================== */}

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Business Hours</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2">Opening Time</label>

            <input
              type="time"
              name="openingTime"
              value={form.openingTime}
              onChange={handleChange}
              className="w-full h-12 border rounded-lg px-4"
            />
          </div>

          <div>
            <label className="block mb-2">Closing Time</label>

            <input
              type="time"
              name="closingTime"
              value={form.closingTime}
              onChange={handleChange}
              className="w-full h-12 border rounded-lg px-4"
            />
          </div>
        </div>
      </div>

      {/* ======================================
          REGIONAL SETTINGS
      ====================================== */}

      <div className="bg-white rounded-2xl border p-6">
        <h2 className="text-xl font-bold mb-6">Regional Settings</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2">Currency</label>

            <select
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-full h-12 border rounded-lg px-4"
            >
              <option value="INR">Indian Rupee (₹)</option>

              <option value="USD">US Dollar ($)</option>

              <option value="AED">UAE Dirham (AED)</option>
            </select>
          </div>

          <div>
            <label className="block mb-2">Country</label>

            <input
              value="India"
              disabled
              className="w-full h-12 border rounded-lg px-4 bg-gray-100"
            />
          </div>
        </div>
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
            border-gray-300
            hover:bg-gray-100
            transition
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
            bg-blue-600
            hover:bg-blue-700
            text-white
            flex
            items-center
            gap-2
            transition
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