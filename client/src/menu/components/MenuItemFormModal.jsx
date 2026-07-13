// client/src/menu/components/MenuItemFormModal.jsx
import React, { useEffect, useState } from "react";
import { FiClock, FiImage } from "react-icons/fi";
import { fetchSubCategories, createMenuItem, updateMenuItem, uploadImage } from "../menuApi";
import { ui } from "../menuTheme";
import { ErrorBanner, Toggle } from "../MenuUI";

const SectionLabel = ({ children }) => (
  <h3 className={ui.sectionLabel}>{children}</h3>
);

const Field = ({ label, required, children }) => (
  <div>
    <label className={ui.label}>
      {label} {required && <span className="text-[#EF5350]">*</span>}
    </label>
    {children}
  </div>
);

const MenuItemFormModal = ({ initial, categories, kitchenSections, onClose, onSaved }) => {
  const isEdit = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name || "");
  const [shortName, setShortName] = useState(initial?.shortName || "");
  const [sku, setSku] = useState(initial?.sku || "");
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
    <div className={ui.modalOverlay}>
      <div className={`${ui.modalCard} max-w-2xl max-h-[90vh]`}>
        <div className={ui.modalHeader}>
          <div>
            <h2 className={`text-xl font-semibold tracking-tight ${ui.heading}`}>
              {isEdit ? "Edit Menu Item" : "Add Menu Item"}
            </h2>
            <p className={`text-sm ${ui.faint} mt-0.5`}>Complete details for the dish or beverage</p>
          </div>
          <button onClick={onClose} className={`${ui.faint} hover:text-[#1F2937] dark:hover:text-white text-2xl leading-none`}>×</button>
        </div>

        <div className="px-6 py-6 space-y-2 overflow-y-auto flex-1">
          {error && <div className="mb-2"><ErrorBanner>{error}</ErrorBanner></div>}

          {/* Image */}
          <SectionLabel>Photo</SectionLabel>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-24 h-24 rounded-2xl bg-[#F3F5EE] dark:bg-[#1E241C] overflow-hidden flex items-center justify-center flex-shrink-0 border border-[#E7EAE1] dark:border-[#262B24] shadow-sm">
              {imagePreview ? (
                <img src={imagePreview} alt="" className="w-full h-full object-cover" />
              ) : (
                <FiImage className={`${ui.faint} text-3xl`} />
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className={`text-sm ${ui.muted} file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#3FA34D]/10 dark:file:bg-[#43B75A]/15 file:text-[#3FA34D] dark:file:text-[#43B75A] file:text-sm file:font-medium hover:file:bg-[#3FA34D]/20`}
            />
          </div>

          {/* Basic Info */}
          <SectionLabel>Basic Information</SectionLabel>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2"><Field label="Item Name" required>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chicken Biryani" className={ui.input} />
            </Field></div>
            <Field label="Short Name">
              <input type="text" value={shortName} onChange={(e) => setShortName(e.target.value)} placeholder="For KOT/receipt" className={ui.input} />
            </Field>
            <Field label="SKU" required>
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g. BIR-001" className={ui.input} />
            </Field>
            <Field label="Food Type">
              <select value={foodType} onChange={(e) => setFoodType(e.target.value)} className={ui.input}>
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
              <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubCategoryId(""); }} className={ui.input}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Sub Category">
              <select value={subCategoryId} onChange={(e) => setSubCategoryId(e.target.value)} disabled={!categoryId} className={ui.input}>
                <option value="">{!categoryId ? "Select category first" : "None"}</option>
                {subCategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <div className="col-span-2"><Field label="Kitchen Section">
              <select value={kitchenSectionId} onChange={(e) => setKitchenSectionId(e.target.value)} className={ui.input}>
                <option value="">None</option>
                {kitchenSections.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
              </select>
            </Field></div>
          </div>

          {/* Pricing */}
          <SectionLabel>Pricing & Tax</SectionLabel>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Field label="Selling Price" required>
              <input type="number" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} placeholder="0.00" className={ui.input} />
            </Field>
            <Field label="Cost Price">
              <input type="number" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} placeholder="0.00" className={ui.input} />
            </Field>
            <Field label="GST %">
              <input type="number" value={gstPercent} onChange={(e) => setGstPercent(e.target.value)} className={ui.input} />
            </Field>
            <Field label="Service Charge">
              <input type="number" value={serviceCharge} onChange={(e) => setServiceCharge(e.target.value)} placeholder="Optional" className={ui.input} />
            </Field>
          </div>

          {/* Timing */}
          <SectionLabel>
            <span className="inline-flex items-center gap-1.5"><FiClock size={13} /> Timing (used to flag late orders)</span>
          </SectionLabel>
          <div className="grid grid-cols-2 gap-4 mb-1">
            <Field label="Kitchen Prep Time (minutes)">
              <input type="number" value={prepTimeMinutes} onChange={(e) => setPrepTimeMinutes(e.target.value)} placeholder="e.g. 20" className={ui.input} />
            </Field>
            <Field label="Target Serve Time (minutes)">
              <input type="number" value={targetServeMinutes} onChange={(e) => setTargetServeMinutes(e.target.value)} placeholder="e.g. 25" className={ui.input} />
            </Field>
          </div>
          <p className={`text-xs ${ui.faint} mb-4`}>
            Prep time is kitchen cook time; serve time is total time from order to table — orders exceeding this will be flagged late once Orders/KDS tracking is connected.
          </p>

          {/* Description */}
          <SectionLabel>Description</SectionLabel>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Shown on QR menu, mobile app, and online ordering"
            className={`${ui.input} resize-none mb-4`}
          />

          {/* Status & Availability */}
          <SectionLabel>Availability</SectionLabel>
          <div className="grid grid-cols-2 gap-4 mb-2">
            <Field label="Item Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={ui.input}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </Field>
            <Toggle label={isAvailable ? "Available" : "Unavailable"} value={isAvailable} onChange={setIsAvailable} tone="green" />
            <Toggle label={isSeasonal ? "Seasonal" : "Regular"} value={isSeasonal} onChange={setIsSeasonal} tone="amber" />
            <Toggle label={isHiddenFromPOS ? "Hidden from POS" : "Visible in POS"} value={isHiddenFromPOS} onChange={setIsHiddenFromPOS} tone="red" />
          </div>
        </div>

        <div className={ui.modalFooter}>
          <button onClick={onClose} disabled={saving} className={ui.btnCancel}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={ui.btnPrimary}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add item"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MenuItemFormModal;
