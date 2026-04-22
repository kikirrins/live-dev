import { defineConfig } from "tsup";

export default defineConfig([
  // React components — "use client" banner required for Next.js App Router
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    clean: true,
    external: ["react", "next"],
    esbuildOptions(opts) {
      opts.banner = { js: '"use client";' };
    },
  },
  // Server entry — node-only helpers (fs). No "use client" banner.
  {
    entry: { server: "src/server.ts" },
    format: ["esm", "cjs"],
    dts: true,
    splitting: false,
    external: ["react", "next", "node:fs", "node:path"],
    platform: "node",
  },
  // CLI — ESM only, no "use client"
  {
    entry: { cli: "src/cli.ts" },
    format: ["esm"],
    dts: true,
    splitting: false,
    external: ["react", "next"],
  },
]);
