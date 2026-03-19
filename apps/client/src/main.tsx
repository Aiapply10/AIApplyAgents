import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./supertokens";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
