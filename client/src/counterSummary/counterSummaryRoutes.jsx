// src/counterSummary/counterSummaryRoutes.jsx
//
// Mounted in App.jsx as
//   <Route path="/counter-summary/*" element={<CounterSummaryRoutes />} />
// following the same pattern as posRoutes / reportsRoutes / tablesRoutes.
import { Routes, Route, Navigate } from "react-router-dom";
import CounterSummary from "./CounterSummary";

export default function CounterSummaryRoutes() {
  return (
    <Routes>
      <Route index element={<CounterSummary />} />
      <Route path="*" element={<Navigate to="/counter-summary" replace />} />
    </Routes>
  );
}