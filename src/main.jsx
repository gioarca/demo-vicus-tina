import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import VicusTina from "./components/VicusTina.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <VicusTina />
  </StrictMode>,
);
