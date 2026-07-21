// src/tables/tablesRoutes.jsx
//
// Matches the same pattern as reportsRoutes.jsx / posRoutes.jsx / menuRoutes.jsx
// used elsewhere in App.jsx: a component that renders its own nested
// <Routes>, mounted in App.jsx as:
//
//   <Route path="/tables/*" element={<Tables />} />
//
// Because App.jsx already strips the "/tables" prefix (via the "/*"), the
// routes declared here are relative to that — "/" means "/tables" itself.
// Add more paths here later (e.g. a table detail page) without ever
// touching App.jsx again.
import { Routes, Route } from "react-router-dom";
import Tables from "./Tables";

export default function TablesRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Tables />} />
    </Routes>
  );
}