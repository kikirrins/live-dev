"use client";

import { useEffect } from "react";
import { isAllowed } from "./whitelist";

interface OverlayLoaderProps {
  /**
   * Identifier of the currently signed-in app user (email, user id, etc.).
   * Compared against `allowedUsers` in livedev.whitelist.json.
   * If omitted or not whitelisted, the overlay will not load.
   */
  userId?: string | null;
  githubToken?: string;
  githubRepo?: string;
}

function parseAllowedUsers(): string[] {
  const raw = process.env.NEXT_PUBLIC_LIVEDEV_WHITELIST;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function OverlayLoader({
  userId,
  githubToken,
  githubRepo,
}: OverlayLoaderProps = {}) {
  useEffect(() => {
    const enabled =
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_LIVEDEV_ENABLED === "true";
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if ((window as any).__LIVEDEV_OVERLAY__) return;

    const allowedUsers = parseAllowedUsers();
    if (!isAllowed(userId ?? null, { allowedUsers })) {
      console.debug("[livedev] overlay disabled: user not in whitelist");
      return;
    }

    const token = githubToken ?? process.env.NEXT_PUBLIC_GITHUB_TOKEN ?? "";
    const repo = githubRepo ?? process.env.NEXT_PUBLIC_GITHUB_REPO ?? "";

    (window as any).__LIVEDEV_OVERLAY__ = true;
    (window as any).__LIVEDEV_GITHUB__ = {
      token,
      repo,
      userId,
      allowedUsers,
    };

    const script = document.createElement("script");
    script.type = "module";
    script.src = "/livedev-overlay.js";
    script.defer = true;
    document.head.appendChild(script);
  }, [userId, githubToken, githubRepo]);

  return null;
}
