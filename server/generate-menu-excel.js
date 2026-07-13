// generate-menu-excel.js
// Run: npm install xlsx
// Then: node generate-menu-excel.js

import  XLSX from "xlsx";

const headers = ["name", "sku", "categoryName", "sellingPrice", "costPrice", "gstPercent", "foodType", "description"];

const categories = ["Biryani", "Chinese", "Beverages", "Starters", "Desserts", "South Indian", "North Indian", "Pizza"];
const foodTypes = ["VEG", "NON_VEG", "EGG"];

const dishNames = [
  "Chicken Biryani", "Veg Manchurian", "Cold Coffee", "Paneer Tikka", "Gulab Jamun",
  "Masala Dosa", "Butter Chicken", "Margherita Pizza", "Veg Fried Rice", "Chicken 65",
  "Mutton Curry", "Egg Curry", "Veg Spring Roll", "Chocolate Brownie", "Filter Coffee",
  "Rava Idli", "Paneer Butter Masala", "Chicken Momos", "Veg Pulao", "Mango Lassi",
  "Fish Fry", "Chilli Paneer", "Tandoori Chicken", "Veg Noodles", "Chicken Shawarma",
  "Dal Makhani", "Prawn Curry", "Onion Uttapam", "Ice Cream Sundae", "Lemon Soda",
];

const descriptions = [
  "Fragrant basmati rice with spiced chicken",
  "Crispy vegetable balls in tangy sauce",
  "Chilled coffee blended with ice cream",
  "Marinated cottage cheese grilled to perfection",
  "Soft milk dumplings soaked in sugar syrup",
  "Crispy rice crepe served with chutney and sambar",
  "Rich and creamy tomato-based chicken curry",
  "Classic pizza with mozzarella and basil",
  "Wok-tossed rice with mixed vegetables",
  "Spicy deep-fried chicken tossed in curry leaves",
];

// Build 30 dummy rows
const rows = [];
for (let i = 0; i < 30; i++) {
  const name = dishNames[i % dishNames.length];
  const category = categories[i % categories.length];
  const foodType = foodTypes[i % foodTypes.length];
  const sellingPrice = 100 + (i * 15) % 400;
  const costPrice = Math.round(sellingPrice * 0.45);
  const gstPercent = [5, 12, 18][i % 3];
  const description = descriptions[i % descriptions.length];
  const sku = `${category.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`;

  rows.push([name, sku, category, sellingPrice, costPrice, gstPercent, foodType, description]);
}

// Combine header + rows into a single sheet
const sheetData = [headers, ...rows];

const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

XLSX.writeFile(workbook, "menu-import-sample.xlsx");

console.log("Saved menu-import-sample.xlsx with", rows.length, "dummy rows");