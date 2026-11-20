import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves the site from /bharat-darshan/. VITE_BASE overrides it (e.g. "/" for local previews).
const base = process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS === "true" ? "/bharat-darshan/" : "/");

export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    include: ["src/**/*.test.{js,jsx}", "scripts/**/*.test.{js,mjs}"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{js,jsx}", "scripts/lib/**/*.mjs"],
      exclude: ["src/main.jsx", "src/test/**", "src/data/**", "**/*.test.{js,jsx,mjs}"],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
