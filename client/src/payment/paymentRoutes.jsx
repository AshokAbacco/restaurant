// src/payment/paymentRoutes.jsx

import { Routes, Route } from "react-router-dom";
import Payment from "./payment"; // <-- Make sure the filename matches

function PaymentRoutes() {
  return (
    <Routes>
      <Route index element={<Payment />} />
    </Routes>
  );
}

export default PaymentRoutes;