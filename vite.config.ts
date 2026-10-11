import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Hosted on GitHub Pages at https://ih-zonaid.github.io/my-world/, so the
// production build is served from the "/my-world/" sub-path. Dev keeps "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/my-world/" : "/",
  plugins: [react()],
  build: { chunkSizeWarningLimit: 2000 },
}));
