// ==============================================
// src/kiosk/kioskRoutes.jsx
// ==============================================

import React from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";

import IdleScreen from "./components/IdleScreen";
import KioskHome from "./KioskHome";

const IdleEntry = () => {
  const navigate = useNavigate();
  return <IdleScreen onStart={() => navigate("home")} />;
};

const KioskRoutes = () => {
  return (
    <Routes>
      {/* Attract screen — tapping anywhere starts a new order */}
      <Route index element={<IdleEntry />} />

      {/* Full ordering flow: menu -> cart -> checkout -> payment -> success
          all live inside KioskHome, which resets itself and the kiosk
          returns here automatically once the countdown on the success
          screen finishes (see KioskHome's resetKiosk + onFinish). */}
      <Route path="home" element={<KioskHome />} />

      {/* 404 */}
      <Route path="*" element={<Navigate to="." replace />} />
    </Routes>
  );
};

export default KioskRoutes;
