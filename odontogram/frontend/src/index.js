import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

try {
  const theme = localStorage.getItem("odontogram-theme") || "dark";
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
} catch {
  // Fall back to default dark theme
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
