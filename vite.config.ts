import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Two pages: the engine UI, and the stage document every device iframe loads.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: { input: { main: "index.html", stage: "stage.html" } },
  },
});
