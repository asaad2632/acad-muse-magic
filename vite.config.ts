import { defineConfig } from "@lovable.dev/vite-tanstack-config";
export default defineConfig({
  nitro: { preset: "node-server" },
  tanstackStart: { server: { entry: "server" } },
  vite: { server: { host: "0.0.0.0", port: 3000, strictPort: true, allowedHosts: true } },
});
