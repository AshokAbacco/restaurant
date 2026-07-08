// ==============================================
// client/src/settings/settingsRoutes.jsx
// ==============================================

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Dashboard
import SettingsDashboard from "./SettingsDashboard";

// Restaurant
import RestaurantProfile from "./restaurant/RestaurantProfile";

// Users
import UsersRoles from "./users/UsersRoles";
import UserForm from "./users/UserForm";
import RolePermissions from "./users/RolePermissions";

// Kiosk
import KioskSettings from "./kiosk/KioskSettings";

// QR
import QRSettings from "./qr/QRSettings";

// Payment
import PaymentGateway from "./payment/PaymentGateway";

// Tax
import TaxBilling from "./tax/TaxBilling";

// Printer
import PrinterSettings from "./printer/PrinterSettings";

// Notifications
import NotificationSettings from "./notifications/NotificationSettings";

// Appearance
import AppearanceSettings from "./appearance/AppearanceSettings";

// Backup
import BackupRestore from "./backup/BackupRestore";

// Subscription
import Subscription from "./subscription/Subscription";

// System
import SystemSettings from "./system/SystemSettings";

const SettingsRoutes = () => {
  return (
    <Routes>
      {/* Dashboard */}
      <Route index element={<SettingsDashboard />} />

      {/* Restaurant */}
      <Route path="restaurant" element={<RestaurantProfile />} />

      {/* Users */}
      <Route path="users" element={<UsersRoles />} />
      <Route path="users/new" element={<UserForm />} />
      <Route path="users/:id/edit" element={<UserForm />} />
      <Route path="roles" element={<RolePermissions />} />

      {/* Kiosk */}
      <Route path="kiosk" element={<KioskSettings />} />

      {/* QR */}
      <Route path="qr" element={<QRSettings />} />

      {/* Payment */}
      <Route path="payment" element={<PaymentGateway />} />

      {/* Tax */}
      <Route path="tax" element={<TaxBilling />} />

      {/* Printer */}
      <Route path="printer" element={<PrinterSettings />} />

      {/* Notifications */}
      <Route path="notifications" element={<NotificationSettings />} />

      {/* Appearance */}
      <Route path="appearance" element={<AppearanceSettings />} />

      {/* Backup */}
      <Route path="backup" element={<BackupRestore />} />

      {/* Subscription */}
      <Route path="subscription" element={<Subscription />} />

      {/* System */}
      <Route path="system" element={<SystemSettings />} />

      {/* Default */}
      <Route path="*" element={<Navigate to="/settings" replace />} />
    </Routes>
  );
};

export default SettingsRoutes;
