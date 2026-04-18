import React from "react";
import ReactDOM from "react-dom/client";
import HomePage from "./HomePage.jsx";
import SitePage from "./pages/SitePage.jsx";
import AdminPage from "./pages/AdminPage.jsx";

// Simple client-side router — no react-router needed
function App() {
  const path = window.location.pathname;

  if (path.startsWith("/site/")) return <SitePage />;
  if (path === "/admin" || path.startsWith("/admin/")) return <AdminPage />;
  return <HomePage />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
