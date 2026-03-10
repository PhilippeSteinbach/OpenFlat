import React from "react";
import ReactDOM from "react-dom/client";
import { AppRoutes } from "@/app/AppRoutes";
import "@/shared/hooks/useTheme"; // Initialize theme before render
import "@/shared/i18n";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppRoutes />
  </React.StrictMode>,
);
