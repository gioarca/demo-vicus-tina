import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// npm run dev            → app di sviluppo
// npm run build:pagina   → una sola pagina HTML con JS, CSS e font incorporati (per l'anteprima)
export default defineConfig(({ mode }) => {
  const pagina = mode === "pagina";
  return {
    plugins: [react(), tailwindcss()],
    build: pagina ? { outDir: "dist-pagina", assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false } : {},
  };
});
