// ==============================================
// src/kiosk/utils/menuAdapter.js
// ==============================================
// FoodCard / FoodGrid / CartSidebar etc. were originally built against
// demo data shaped like { id, name, category, price, image, veg,
// bestseller, rating, description }. This adapter maps the real backend
// response (kioskApi.fetchKioskMenu) onto that same shape so none of the
// presentational components need to change.

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600";

const CATEGORY_ICONS = {
  Pizza: "🍕",
  Burger: "🍔",
  Burgers: "🍔",
  Biryani: "🍛",
  Chinese: "🥡",
  Drinks: "🥤",
  Drink: "🥤",
  Dessert: "🍰",
  Desserts: "🍰",
  Beverages: "🥤",
  Starters: "🍢",
  Sides: "🍟",
  Sauces: "🥫",
  Sources: "🥫",
  Salad: "🥗",
  Salads: "🥗",
  "Kids Menu": "🧒",
  Breakfast: "🥐",
  "Main Course": "🍽️",
};

export function adaptMenuItem(item) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    categoryId: item.categoryId,
    subCategory: item.subCategory || null,
    price: item.price,
    image: item.image || FALLBACK_IMAGE,
    veg: item.foodType === "VEG",
    bestseller: false,
    rating: 4.6,
    description: item.description || "",
    variants: item.variants || [],
  };
}

export function adaptCategories(categories) {
  const mapped = categories.map((c) => ({
    id: c.id,
    name: c.name,
    icon: CATEGORY_ICONS[c.name] || "🍽️",
  }));

  return [{ id: "all", name: "All", icon: "🍽️" }, ...mapped];
}
