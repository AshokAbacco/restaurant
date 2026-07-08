// client/src/menu/components/MenuItemFormModal.jsx
import React, { useEffect, useState } from "react";
import { FiClock, FiImage } from "react-icons/fi";
import { fetchSubCategories, createMenuItem, updateMenuItem, uploadImage } from "../menuApi";

const SectionLabel = ({ children }) => (
  <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-3 mt-1">
    {children}
  </h3>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

const inputClass =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

const Toggle = ({ label, value, onChange, activeColor = "green" }) => {
  const colors = {
    green: value ? "bg-green-50 border-green-200 text-green-700" : "bg-gray-50 border-gray-200 text-gray-500",
    amber: value ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-gray-50 border-gray-200 text-gray-500",
    red: value ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-50 border-gray-200 text-gray-500",
  };
  const dot = { green: "bg-green-500", amber: "bg-amber-500", red: "bg-red-500" };

  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${colors[activeColor]}`}
    >
      {label}
      <span className={`w-9 h-5 rounded-full relative transition-colors ${value ? dot[activeColor] : "bg-gray-300"}`}>
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            value ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
};

const MenuItemFormModal = ({ initial, categories, kitchenSections, onClose, onSaved }) => {
  const isEdit = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name || "");
  const [shortName, setShortName] = useState(initial?.shortName || "");
  const [sku, setSku] = useState(initial?.sku || "");
  const [barcode, setBarcode] = useState(initial?.barcode || "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || "");
  const [subCategoryId, setSubCategoryId] = useState(initial?.subCategoryId || "");
  const [subCategories, setSubCategories] = useState([]);
  const [kitchenSectionId, setKitchenSectionId] = useState(initial?.kitchenSectionId || "");
  const [foodType, setFoodType] = useState(initial?.foodType || "VEG");
  const [sellingPrice, setSellingPrice] = useState(initial?.sellingPrice ?? "");
  const [costPrice, setCostPrice] = useState(initial?.costPrice ?? "");
  const [gstPercent, setGstPercent] = useState(initial?.gstPercent ?? 0);
  const [serviceCharge, setServiceCharge] = useState(initial?.serviceCharge ?? "");
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(initial?.prepTimeMinutes ?? "");
  const [targetServeMinutes, setTargetServeMinutes] = useState(initial?.targetServeMinutes ?? "");
  const [description, setDescription] = useState(initial?.description || "");
  const [isAvailable, setIsAvailable] = useState(initial?.isAvailable ?? true);
  const [isSeasonal, setIsSeasonal] = useState(initial?.isSeasonal ?? false);
  const [isHiddenFromPOS, setIsHiddenFromPOS] = useState(initial?.isHiddenFromPOS ?? false);
  const [status, setStatus] = useState(initial?.status || "ACTIVE");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || "");
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl || "");
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!categoryId) { setSubCategories([]); return; }
    fetchSubCategories(categoryId).then((r) => { if (r.ok) setSubCategories(r.data.data || []); });
  }, [categoryId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!name.trim() || !sku.trim() || !categoryId || sellingPrice === "") {
      setError("Name, SKU, category, and selling price are required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      let finalImageUrl = imageUrl;
      if (imageFile) {
        const up = await uploadImage(imageFile, "menu-items");
        if (!up.ok) throw new Error(up.data?.message || "Image upload failed");
        finalImageUrl = up.data.data.url;
      }

      const payload = {
        name: name.trim(),
        shortName: shortName.trim() || null,
        sku: sku.trim(),
        barcode: barcode.trim() || null,
        categoryId,
        subCategoryId: subCategoryId || null,
        kitchenSectionId: kitchenSectionId || null,
        foodType,
        sellingPrice: Number(sellingPrice),
        costPrice: costPrice === "" ? null : Number(costPrice),
        gstPercent: Number(gstPercent) || 0,
        serviceCharge: serviceCharge === "" ? null : Number(serviceCharge),
        prepTimeMinutes: prepTimeMinutes === "" ? null : Number(prepTimeMinutes),
        targetServeMinutes: targetServeMinutes === "" ? null : Number(targetServeMinutes),
        description: description.trim() || null,
        isAvailable, isSeasonal, isHiddenFromPOS, status,
        imageUrl: finalImageUrl || null,
      };

      const result = isEdit ? await updateMenuItem(initial.id, payload) : await createMenuItem(payload);
      if (!result.ok) {
        throw new Error(result.data?.errors?.join(", ") || result.data?.message || "Failed to save item");
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              {isEdit ? "Edit Menu Item" : "Add Menu Item"}
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">Complete details for the dish or beverage</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-6 py-6 space-y-2">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mb-2">{error}</div>}

          {/* Image */}
          <SectionLabel>Photo</SectionLabel>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-24 h-24 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-200 shadow-sm">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <FiImage className="text-gray-300 text-3xl" />
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:text-sm file:font-medium hover:file:bg-blue-100"
            />
          </div>

          {/* Basic Info */}
          <SectionLabel>Basic Information</SectionLabel>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2"><Field label="Item Name" required>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken Biryani" className={inputClass} />
            </Field></div>
            <Field label="Short Name">
              <input type="text" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="For KOT/receipt" className={inputClass} />
            </Field>
            <Field label="SKU" required>
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. BIR-001" className={inputClass} />
            </Field>
            <Field label="Barcode">
              <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Optional" className={inputClass} />
            </Field>
            <Field label="Food Type">
              <select value={foodType} onChange={(e) => setFoodType(e.target.value)} className={inputClass}>
                <option value="VEG">Veg</option>
                <option value="NON_VEG">Non-Veg</option>
                <option value="EGG">Egg</option>
              </select>
            </Field>
          </div>

          {/* Classification */}
          <SectionLabel>Classification</SectionLabel>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Category" required>
              <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubCategoryId(""); }} className={inputClass}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Sub Category">
              <select value={subCategoryId} onChange={(e) => setSubCategoryId(e.target.value)} disabled={!categoryId} className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-400`}>
                <option value="">{!categoryId ? "Select category first" : "None"}</option>
                {subCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <div className="col-span-2"><Field label="Kitchen Section">
              <select value={kitchenSectionId} onChange={(e) => setKitchenSectionId(e.target.value)} className={inputClass}>
                <option value="">None</option>
                {kitchenSections.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </Field></div>
          </div>

          {/* Pricing */}
          <SectionLabel>Pricing & Tax</SectionLabel>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Selling Price" required>
              <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="0.00" className={inputClass} />
            </Field>
            <Field label="Cost Price">
              <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" className={inputClass} />
            </Field>
            <Field label="GST %">
              <input type="number" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Service Charge">
              <input type="number" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} placeholder="Optional" className={inputClass} />
            </Field>
          </div>

          {/* Timing */}
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5"><FiClock size={13} /> Timing (used to flag late orders)</span>
          </SectionLabel>
          <div className="grid grid-cols-2 gap-4 mb-1">
            <Field label="Kitchen Prep Time (minutes)">
              <input type="number" value={prepTimeMinutes} onChange={(e) => setPrepTimeMinutes(e.target.value)} placeholder="e.g. 20" className={inputClass} />
            </Field>
            <Field label="Target Serve Time (minutes)">
              <input type="number" value={targetServeMinutes} onChange={(e) => setTargetServeMinutes(e.target.value)} placeholder="e.g. 25" className={inputClass} />
            </Field>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Prep time is kitchen cook time; serve time is total time from order to table — orders exceeding this will be flagged late once Orders/KDS tracking is connected.
          </p>

          {/* Description */}
          <SectionLabel>Description</SectionLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Shown on QR menu, mobile app, and online ordering"
            className={`${inputClass} resize-none mb-4`}
          />

          {/* Status & Availability */}
          <SectionLabel>Availability</SectionLabel>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <Field label="Item Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </Field>
            <Toggle label={isAvailable ? "Available" : "Unavailable"} value={isAvailable} onChange={setIsAvailable} activeColor="green" />
            <Toggle label={isSeasonal ? "Seasonal" : "Regular"} value={isSeasonal} onChange={setIsSeasonal} activeColor="amber" />
            <Toggle label={isHiddenFromPOS ? "Hidden from POS" : "Visible in POS"} value={isHiddenFromPOS} onChange={setIsHiddenFromPOS} activeColor="red" />
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 shadow-sm">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add item"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuItemFormModal;