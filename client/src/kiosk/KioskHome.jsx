// ==============================================
// src/kiosk/KioskHome.jsx
// ==============================================

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import KioskWelcome from "./KioskWelcome";
import KioskMenuExplore from "./KioskMenuExplore";
import KioskCategoryView from "./KioskCategoryView";
import KioskPaymentType from "./KioskPaymentType";
import KioskQrScan from "./KioskQrScan";
import KioskOrderSuccess from "./KioskOrderSuccess";

import OrderBottomBar from "./components/OrderBottomBar";
import MyOrderPanel from "./components/MyOrderPanel";
import ItemCustomizeModal from "./components/ItemCustomizeModal";

import {
  fetchKioskMenu,
  createOrder,
  KioskApiError,
} from "./services/kioskApi";

const STAGE = {
  WELCOME: "welcome",
  EXPLORE: "explore",
  CATEGORY: "category",
  PAYMENT: "payment",
  QR: "qr",
  SUCCESS: "success",
};

const KioskHome = () => {
  const navigate = useNavigate();

  // ==========================================
  // MENU DATA
  // ==========================================
  const [categories, setCategories] = useState([]);
  const [foods, setFoods] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState("");

  const loadMenu = async () => {
    setMenuLoading(true);
    setMenuError("");
    try {
      const menu = await fetchKioskMenu();

      const rawCategories = (
        menu?.categories ||
        menu?.data?.categories ||
        []
      ).map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || "",
        image: cat.image,
        displayOrder: cat.displayOrder ?? 0,
      }));

      const rawItems = (menu?.items || menu?.data?.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description || "",
        price: item.price,
        image: item.image,
        foodType: item.foodType,
        categoryId: item.categoryId,
        category: item.category,
        subCategory: item.subCategory || null,
        prepTimeMinutes: item.prepTimeMinutes || 10,
        variants: item.variants || [],
      }));

      setCategories(rawCategories);
      setFoods(rawItems);
    } catch (err) {
      setMenuError(
        err instanceof KioskApiError
          ? err.message
          : "Could not load the menu. Please check your connection.",
      );
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // ==========================================
  // FLOW STATE
  // ==========================================
  const [stage, setStage] = useState(STAGE.WELCOME);
  const [orderType, setOrderType] = useState("DINE_IN");
  const [activeCategory, setActiveCategory] = useState(null);

  // ==========================================
  // CART
  // ==========================================
  const [cart, setCart] = useState([]);
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showItemModal, setShowItemModal] = useState(false);

  const addLineToCart = (item, quantity) => {
    setCart((prev) => [
      ...prev,
      {
        ...item,
        cartLineId: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        quantity,
      },
    ]);
  };

  const handleAddToCart = (mainItem, quantity, extraLines = []) => {
    addLineToCart(mainItem, quantity);
    extraLines.forEach(({ item, quantity: qty }) => addLineToCart(item, qty));
    setShowItemModal(false);
    setSelectedItem(null);
  };

  const updateQuantity = (cartLineId, quantity) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((l) => l.cartLineId !== cartLineId));
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.cartLineId === cartLineId ? { ...l, quantity } : l)),
    );
  };

  const removeLine = (cartLineId) => {
    setCart((prev) => prev.filter((l) => l.cartLineId !== cartLineId));
  };

  const cartTotal = cart.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const cartItemCount = cart.reduce((sum, l) => sum + l.quantity, 0);

  // ==========================================
  // ORDER CREATION
  // ==========================================
  const [order, setOrder] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");

  const handleOrderNow = async () => {
    if (cart.length === 0) return;
    setPlacingOrder(true);
    setOrderError("");

    try {
      const created = await createOrder({
        orderType,
        items: cart.map((line) => ({
          menuItemId: line.id,
          quantity: line.quantity,
          addOnIds: line.addOnIds || [],
          notes: line.notes || undefined,
        })),
      });
      setOrder(created);
      setPanelExpanded(false);
      setStage(STAGE.PAYMENT);
    } catch (err) {
      setOrderError(
        err instanceof KioskApiError
          ? [err.message, ...(err.errors || [])].join(" — ")
          : "Could not place your order. Please try again.",
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  // ==========================================
  // RESET & SESSION FLUSH
  // ==========================================
  const resetKiosk = () => {
    setCart([]);
    setPanelExpanded(false);
    setSelectedItem(null);
    setShowItemModal(false);
    setOrder(null);
    setOrderError("");
    setActiveCategory(null);
    setOrderType("DINE_IN");
    setStage(STAGE.WELCOME);
    navigate("/kiosk", { replace: true });
  };

  // ==========================================
  // ANTI-IDLE SESSION GUARDIAN
  // ==========================================

  const idleTimer = useRef(null);

  useEffect(() => {
    const IDLE_TIMEOUT = 60000; // 1 minute

    const resetTimer = () => {
      clearTimeout(idleTimer.current);

      idleTimer.current = setTimeout(() => {
        resetKiosk();
      }, IDLE_TIMEOUT);
    };

    const events = [
      "mousemove",
      "mousedown",
      "click",
      "keydown",
      "scroll",
      "touchstart",
      "touchmove",
    ];

    events.forEach((event) => window.addEventListener(event, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(idleTimer.current);

      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, []);

  // ==========================================
  // NAVIGATION HELPERS
  // ==========================================
  const handleWelcomeSelect = (type) => {
    setOrderType(type);
    setStage(STAGE.EXPLORE);
  };

  const handleSelectCategory = (categoryName) => {
    setActiveCategory(categoryName);
    setStage(STAGE.CATEGORY);
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setShowItemModal(true);
  };

  const showOrderChrome = stage === STAGE.EXPLORE || stage === STAGE.CATEGORY;

  return (
    <div className="h-screen w-screen max-h-screen bg-[#FAFAFX] overflow-hidden relative font-sans antialiased text-[#1C1C1E]">
      {menuLoading && stage !== STAGE.WELCOME && (
        <div className="h-full w-full flex items-center justify-center bg-white/80 backdrop-blur-md z-50">
          <div className="w-12 h-12 border-4 border-[#EE6C2E] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!menuLoading && menuError && stage !== STAGE.WELCOME && (
        <div className="h-full w-full flex items-center justify-center px-6 z-50 bg-[#FAFAFX]">
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-black/[0.02] max-w-md text-center">
            <h2 className="text-xl font-black text-red-500">
              System Integration Error
            </h2>
            <p className="mt-2 text-sm text-[#8E8E93] font-medium leading-relaxed">
              {menuError}
            </p>
            <button
              onClick={loadMenu}
              className="mt-6 w-full py-3.5 rounded-2xl bg-[#EE6C2E] text-white font-bold shadow-md hover:bg-[#d65922] transition-colors active:scale-95"
            >
              Sync Connection
            </button>
          </div>
        </div>
      )}

      {(!menuLoading || stage === STAGE.WELCOME) && !menuError && (
        <div className="w-full h-full flex flex-col">
          {stage === STAGE.WELCOME && (
            <KioskWelcome onSelect={handleWelcomeSelect} />
          )}

          {stage === STAGE.EXPLORE && (
            <KioskMenuExplore
              categories={categories}
              items={foods}
              onBack={() => setStage(STAGE.WELCOME)}
              onSelectCategory={handleSelectCategory}
            />
          )}

          {stage === STAGE.CATEGORY && (
            <KioskCategoryView
              categories={categories}
              items={foods}
              activeCategoryName={activeCategory}
              onChangeCategory={setActiveCategory}
              onBack={() => setStage(STAGE.EXPLORE)}
              onSelectItem={handleSelectItem}
            />
          )}

          {stage === STAGE.PAYMENT && order && (
            <KioskPaymentType
              order={order}
              onBack={() => setStage(STAGE.CATEGORY)}
              onChooseQr={() => setStage(STAGE.QR)}
              onPaid={(updated) => {
                setOrder(updated);
                setStage(STAGE.SUCCESS);
              }}
            />
          )}

          {stage === STAGE.QR && order && (
            <KioskQrScan
              order={order}
              onBack={() => setStage(STAGE.PAYMENT)}
              onPaid={(updated) => {
                setOrder(updated);
                setStage(STAGE.SUCCESS);
              }}
            />
          )}

          {stage === STAGE.SUCCESS && order && (
            <KioskOrderSuccess order={order} onNextOrder={resetKiosk} />
          )}
        </div>
      )}

      {/* Dynamic Overlay Navigation Systems */}
      {showOrderChrome && (
        <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none">
          {panelExpanded && (
            <div className="pointer-events-auto">
              <MyOrderPanel
                cart={cart}
                orderType={orderType}
                onChangeOrderType={setOrderType}
                onUpdateQuantity={updateQuantity}
                onRemove={removeLine}
              />
            </div>
          )}

          {orderError && (
            <div className="absolute bottom-32 left-6 right-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700 text-xs font-bold text-center shadow-lg animate-fade-in pointer-events-auto">
              {orderError}
            </div>
          )}

          <div className="pointer-events-auto">
            <OrderBottomBar
              expanded={panelExpanded}
              onToggleExpand={() => setPanelExpanded((v) => !v)}
              itemCount={cartItemCount}
              total={cartTotal}
              onOrderNow={handleOrderNow}
              onRestart={() => {
                setCart([]);
                setPanelExpanded(false);
              }}
              placingOrder={placingOrder}
            />
          </div>
        </div>
      )}

      {/* Item Customization Modal Tier */}
      <ItemCustomizeModal
        open={showItemModal}
        item={selectedItem}
        allItems={foods}
        onClose={() => {
          setShowItemModal(false);
          setSelectedItem(null);
        }}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
};

export default KioskHome;
