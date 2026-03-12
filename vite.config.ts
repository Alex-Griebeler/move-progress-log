import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("exceljs")) return "vendor-exceljs";
          if (id.includes("@react-pdf")) return "vendor-react-pdf";
          if (id.includes("recharts")) return "vendor-recharts";
          if (id.includes("@dnd-kit")) return "vendor-dnd-kit";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("react-router-dom")) return "vendor-router";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("@supabase/supabase-js")) return "vendor-supabase";

          return undefined;
        },
      },
    },
  },
}));
