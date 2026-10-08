import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readSupabaseConfig } from "./src/config";
export default defineConfig(({ mode }) => {
  const configuration = readSupabaseConfig(
    loadEnv(mode, process.cwd(), "VITE_"),
  );
  // Reject privileged/malformed credentials before Vite can put them in a bundle.
  if (configuration.status === "invalid") throw new Error(configuration.reason);
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            supabase: ["@supabase/supabase-js"],
          },
        },
      },
    },
  };
});
