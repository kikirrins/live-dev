"use client";

import { useEffect } from "react";
import { isAllowed } from "@livedev/whitelist";

interface OverlayLoaderProps {
  /**
   * Identifier of the currently signed-in app user (email, user id, etc.).
   * Compared against `allowedUsers` in livedev.whitelist.json.
   * If omitted or not whitelisted, the overlay does not load.
   */
  userId?: string | null;
  /**
   * Host path that handles overlay submissions. Must be a same-origin route
   * that authenticates the session and forwards to the livedev issues service.
   * Defaults to "/api/livedev/issues".
   */
  endpoint?: string;
  /** Path from which to load the overlay bundle. Defaults to "/livedev-overlay.js". */
  src?: string;
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
  endpoint,
  src,
}: OverlayLoaderProps = {}) {
  useEffect(() => {
    const enabled =
      process.env.NODE_ENV === "development" ||
      process.env.NEXT_PUBLIC_LIVEDEV_ENABLED === "true";
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if ((window as any).__LIVEDEV_OVERLAY__) return;

    // Whitelist in the browser is a UX gate only (hides the toggle for
    // non-admins). Server remains authoritative: POST /api/livedev/issues
    // rejects non-whitelisted users with 403. The whitelist is inlined into
    // the bundle only when LIVEDEV_EXPOSE_WHITELIST=true is set for the
    // Next.js build — otherwise NEXT_PUBLIC_LIVEDEV_WHITELIST is unset and
    // we skip the UX gate (every visitor sees the toggle; clicks are
    // rejected server-side).
    if (process.env.NEXT_PUBLIC_LIVEDEV_WHITELIST) {
      const allowedUsers = parseAllowedUsers();
      if (!isAllowed(userId ?? null, { allowedUsers })) {
        console.debug("[livedev] overlay disabled: user not in whitelist");
        return;
      }
    }

    (window as any).__LIVEDEV_OVERLAY__ = true;
    (window as any).__LIVEDEV__ = {
      endpoint: endpoint ?? "/api/livedev/issues",
      userId,
    };

    const script = document.createElement("script");
    script.type = "module";
    script.src = src ?? "/livedev-overlay.js";
    script.defer = true;
    document.head.appendChild(script);
  }, [userId, endpoint, src]);

  return null;
}
