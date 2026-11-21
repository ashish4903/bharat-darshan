import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves the site from /bharat-darshan/. VITE_BASE overrides it (e.g. "/" for local previews).
const base = process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS === "true" ? "/bharat-darshan/" : "/");

export default defineConfig({
  base,
  plugins: [react()],
  // MapLibre (~300 kB gzipped) is loaded lazily, only when a map is shown.
  build: { chunkSizeWarningLimit: 1200 },
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
      // Network clients (sources, http) and the map canvas are exercised by the data build and the
      // end-to-end tests rather than by unit tests.
      exclude: [
        "src/main.jsx",
        "src/test/**",
        "src/data/**",
        "src/components/MapCanvas.jsx",
        "scripts/lib/sources.mjs",
        "scripts/lib/http.mjs",
        "**/*.test.{js,jsx,mjs}",
      ],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
