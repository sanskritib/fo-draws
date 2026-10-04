import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Source lives in app/. The build writes index.html + assets/ to the repo root,
// so GitHub Pages (serving main from the root) picks it up with no extra setup.
export default defineConfig({
  root: "app",
  base: "./",
  plugins: [react()],
  build: { outDir: "..", emptyOutDir: false, assetsDir: "assets" },
});
