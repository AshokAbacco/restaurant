// ==============================================
// client/src/platform/PlatformRoutes.jsx
// Everything under /platform/*. Lazy-loaded from App.jsx so none of this
// ships to restaurant staff unless they open /platform.
// ==============================================

import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { PlatformAuthProvider, RequirePlatformAuth, usePlatformAuth } from "./PlatformAuth";
import PlatformLayout, { firstAllowedPath } from "./PlatformLayout";
import { Loading } from "./ui";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Restaurants = lazy(() => import("./pages/Restaurants"));
const RestaurantDetail = lazy(() => import("./pages/RestaurantDetail"));
const Renewals = lazy(() => import("./pages/Renewals"));
const Messages = lazy(() => import("./pages/Messages"));
const FollowUps = lazy(() => import("./pages/FollowUps"));
const Plans = lazy(() => import("./pages/Plans"));
const Payments = lazy(() => import("./pages/Payments"));
const Activity = lazy(() => import("./pages/Activity"));
const Webhooks = lazy(() => import("./pages/Webhooks"));
const Enquiries = lazy(() => import("./pages/Enquiries"));
const Team = lazy(() => import("./pages/Team"));
const Settings = lazy(() => import("./pages/Settings"));
const Health = lazy(() => import("./pages/Health"));
const Reports = lazy(() => import("./pages/Reports"));
const Account = lazy(() => import("./pages/Account"));

function Guard({ perm, children }) {
  const { can } = usePlatformAuth();
  if (perm && !can(perm)) {
    return (
      <div className="rounded-2xl border border-[#E7EAE1] bg-white p-10 text-center">
        <p className="text-lg font-bold text-slate-800">No access</p>
        <p className="mt-1 text-sm text-slate-500">Your platform role doesn't include this section. Ask a super admin if you need it.</p>
      </div>
    );
  }
  return children;
}

function Home() {
  const { admin } = usePlatformAuth();
  return <Navigate to={firstAllowedPath(admin)} replace />;
}

const page = (perm, el) => (
  <Guard perm={perm}>
    <Suspense fallback={<Loading />}>{el}</Suspense>
  </Guard>
);

export default function PlatformRoutes() {
  return (
    <PlatformAuthProvider>
      <Routes>
        <Route
          path="login"
          element={
            <Suspense fallback={null}>
              <Login />
            </Suspense>
          }
        />
        <Route element={<RequirePlatformAuth />}>
          <Route element={<PlatformLayout />}>
            <Route index element={<Home />} />
            <Route path="dashboard" element={page("dashboard.read", <Dashboard />)} />
            <Route path="restaurants" element={page("restaurants.read", <Restaurants />)} />
            <Route path="restaurants/:id" element={page("restaurants.read", <RestaurantDetail />)} />
            <Route path="renewals" element={page("renewals.read", <Renewals />)} />
            <Route path="messages" element={page("messages.read", <Messages />)} />
            <Route path="follow-ups" element={page("followups.read", <FollowUps />)} />
            <Route path="plans" element={page("plans.read", <Plans />)} />
            <Route path="payments" element={page("payments.read", <Payments />)} />
            <Route path="activity" element={page("activity.read", <Activity />)} />
            <Route path="webhooks" element={page("webhooks.read", <Webhooks />)} />
            <Route path="enquiries" element={page("enquiries.read", <Enquiries />)} />
            <Route path="team" element={page("team.read", <Team />)} />
            <Route path="settings" element={page("settings.read", <Settings />)} />
            <Route path="health" element={page("health.read", <Health />)} />
            <Route path="reports" element={page("reports.read", <Reports />)} />
            <Route path="account" element={page(null, <Account />)} />
            <Route path="*" element={<Home />} />
          </Route>
        </Route>
      </Routes>
    </PlatformAuthProvider>
  );
}
