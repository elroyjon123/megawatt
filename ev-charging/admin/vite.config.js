import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // keep admin separate from user-app (5174)
    port: 5173,
    strictPort: true,
    host: "127.0.0.1",
  },
  build: {
    rollupOptions: {
      output: {
        // Keep frequently-used vendor libs in stable chunks to improve caching
        // and reduce the size of the main entry chunk.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("react-query")) return "vendor-query";
          if (id.includes("axios")) return "vendor-axios";
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("socket.io-client")) return "vendor-socket";

          if (id.includes("react")) return "vendor-react";

          return "vendor";
        },
      },
    },
  },
});
