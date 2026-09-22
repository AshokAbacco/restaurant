// main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./auth/AuthContext";
import { RestaurantProfileProvider } from "./context/RestaurantProfileContext";
import { CrmProvider } from "./crm/CrmContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RestaurantProfileProvider>
        <CrmProvider>
          <ThemeProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ThemeProvider>
        </CrmProvider>
      </RestaurantProfileProvider>
    </AuthProvider>
  </React.StrictMode>
);