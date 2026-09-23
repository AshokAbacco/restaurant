// src/crm/crmRoutes.jsx
//
// Mounted in App.jsx at /crm/*. Every page is gated on Settings -> CRM:
// when it's off, a single "CRM is turned off" screen is shown instead.
import { Routes, Route, Navigate } from "react-router-dom";
import { useCrm } from "./CrmContext";
import { useAuth } from "../auth/AuthContext";
import { CrmDisabledState, CRM_MANAGER_ROLES } from "./components/crmUI";
import CrmDashboard from "./pages/CrmDashboard";
import CustomerList from "./pages/CustomerList";
import CustomerProfile from "./pages/CustomerProfile";
import CustomerGroups from "./pages/CustomerGroups";
import FollowUps from "./pages/FollowUps";
import LoyaltyProgram from "./pages/LoyaltyProgram";

export default function CrmRoutes() {
  const { enabled, loading } = useCrm();
  const { user } = useAuth();
  const canManage = CRM_MANAGER_ROLES.includes(user?.role);

  if (loading) {
    return <div className="min-h-screen bg-[#F3F5EE] p-6 text-sm text-[#9CA3AF] dark:bg-[#12160F]">Loading…</div>;
  }
  if (!enabled) return <CrmDisabledState canManage={canManage} />;

  return (
    <Routes>
      <Route index element={<CrmDashboard />} />
      <Route path="customers" element={<CustomerList />} />
      <Route path="customers/:id" element={<CustomerProfile />} />
      <Route path="follow-ups" element={<FollowUps />} />
      <Route path="loyalty" element={<LoyaltyProgram />} />
      <Route path="groups" element={<CustomerGroups />} />
      <Route path="*" element={<Navigate to="/crm" replace />} />
    </Routes>
  );
}