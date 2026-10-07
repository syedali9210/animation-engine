import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { studio } from "./server/studio";

// Three pages: the engine UI, the stage document every device iframe loads, and the mockup studio's export page
// (headless Chrome renders it frame by frame; the studio plugin drives that).
export default defineConfig({
  plugins: [react(), tailwindcss(), studio()],
  build: {
    rollupOptions: { input: { main: "index.html", stage: "stage.html", render: "render.html" } },
  },
});
