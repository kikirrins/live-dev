#!/usr/bin/env node
/**
 * livedev init
 *
 * Bootstraps a Next.js project to use @kikirrin/livedev-next:
 *   1. Copies assets/livedev-overlay.js → public/livedev-overlay.js
 *   2. Appends GitHub env var placeholders to .env.local
 *   3. Prints usage instructions
 *
 * Must be run from the Next.js app directory (e.g. apps/lms/), NOT the monorepo root.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");

function run() {
  const [, , command] = process.argv;

  if (command !== "init") {
    console.error(`Unknown command: ${command ?? "(none)"}`);
    console.error("Usage: livedev init");
    process.exit(1);
  }

  const cwd = process.cwd();

  // Warn if running from a monorepo root instead of an app directory
  const hasWorkspaceYaml = fs.existsSync(path.join(cwd, "pnpm-workspace.yaml"));
  const hasNextConfig =
    fs.existsSync(path.join(cwd, "next.config.js")) ||
    fs.existsSync(path.join(cwd, "next.config.mjs")) ||
    fs.existsSync(path.join(cwd, "next.config.ts"));

  if (hasWorkspaceYaml && !hasNextConfig) {
    console.warn(
      "⚠  It looks like you're in a monorepo root, not a Next.js app directory.\n" +
        "   Run this from each app directory instead (e.g. cd apps/lms && livedev init).\n",
    );
  }

  console.log(`\nRunning livedev init in: ${cwd}\n`);

  // ── 1. Copy overlay bundle ────────────────────────────────────────────────
  const overlaySource = path.join(PKG_ROOT, "assets", "livedev-overlay.js");
  const publicDir = path.join(cwd, "public");
  const overlayDest = path.join(publicDir, "livedev-overlay.js");

  if (!fs.existsSync(overlaySource)) {
    console.error(
      "✗ assets/livedev-overlay.js not found — reinstall @kikirrin/livedev-next.",
    );
    process.exit(1);
  }

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.copyFileSync(overlaySource, overlayDest);
  console.log("✓ Copied livedev-overlay.js → public/livedev-overlay.js");

  // ── 2. Check/create .env.local with GitHub placeholders ──────────────────
  const envLocalPath = path.join(cwd, ".env.local");
  const ghVars = ["NEXT_PUBLIC_GITHUB_TOKEN", "NEXT_PUBLIC_GITHUB_REPO"];

  let envContent = "";
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, "utf8");
  }

  const missingVars = ghVars.filter((v) => !envContent.includes(v));
  if (missingVars.length > 0) {
    const lines = [
      "",
      "# Live-Dev overlay — GitHub Issues",
      ...missingVars.map((v) => {
        if (v === "NEXT_PUBLIC_GITHUB_REPO") return `${v}=owner/repo`;
        return `${v}=`;
      }),
    ];
    fs.appendFileSync(envLocalPath, lines.join("\n") + "\n", "utf8");
    console.log("✓ Added GitHub env var placeholders to .env.local — fill in your values");
  } else {
    console.log("✓ .env.local already has GitHub env vars");
  }

  // ── 3. Usage instructions ─────────────────────────────────────────────────
  console.log(`
✓ livedev init complete!

Next steps:
  1. Add <OverlayLoader /> to your root layout:

       import { OverlayLoader } from "@kikirrin/livedev-next";
       // inside <body>:
       <OverlayLoader />

  2. Wrap your next.config with withLiveDev (for file/line source info):

       const withLiveDev = require("@kikirrin/livedev-next/webpack");
       module.exports = withLiveDev(nextConfig);

     This injects source location attributes in dev mode only.
     Works with SWC and next/font — no babel needed.

  3. Fill in the GitHub env vars in .env.local:

       NEXT_PUBLIC_GITHUB_TOKEN=ghp_your_personal_access_token
       NEXT_PUBLIC_GITHUB_REPO=owner/repo

     The token needs "repo" scope (or "issues: write" for fine-grained tokens).

  4. Start your app and click any component to submit a change request.
     Issues are created with the "live-dev" label.
`);
}

run();
