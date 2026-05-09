import { defineConfig } from "@tanstack/react-start/config";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [
      viteTsConfigPaths(),
      tailwindcss(),
      viteReact(),
    ],
  },
  server: {
    preset: "node",
    entry: "./src/server.node.ts",
  },
});
