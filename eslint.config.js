import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  globalIgnores(["dist", "dist-pagina"]),
  {
    files: ["src/**/*.{js,jsx}"],
    extends: [js.configs.recommended, reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: { ecmaVersion: "latest", ecmaFeatures: { jsx: true }, sourceType: "module" },
    },
    rules: {
      // Come nel template Vite; in più "motion", usato solo come <motion.div> (ESLint 9 non legge i nomi JSX con il punto).
      "no-unused-vars": ["error", { varsIgnorePattern: "^([A-Z_]|motion$)", argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["server/**/*.js", "scripts/**/*.mjs", "vite.config.js", "eslint.config.js"],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: globals.node },
  },
]);
