/**
 * ScreenshotStore — the contract the host app implements.
 *
 * Primary path: S3 (or any S3-compatible bucket the host already uses for images).
 * Fallback: the host's existing database as a BLOB column.
 *
 * This module ships only the interface. See INTEGRATION.md for the two recipes.
 *
 * Security invariants the implementer MUST preserve:
 *   - `put` MUST generate an unguessable id (crypto-random UUID v4 or longer).
 *   - `get` MUST NOT enforce authorization itself. The caller (host-proxy viewer
 *     route) is responsible for session + whitelist checks before calling get.
 *     Keeping auth out of the store means the same store works for any route
 *     policy the host wants to layer on top.
 *   - Storage backend MUST be private: S3 buckets with no public ACL, DB rows
 *     reachable only from the host's own code paths.
 */

export interface ScreenshotMeta {
  /** Host-app user id (email/uuid) taken from the server session at upload time. */
  ownerId: string;
  /** Unix epoch millis. */
  createdAt: number;
}

export interface ScreenshotBlob {
  bytes: Uint8Array;
  contentType: "image/png";
  meta: ScreenshotMeta;
}

export interface ScreenshotStore {
  /** Persist bytes + meta. Returns the opaque id the viewer route will receive. */
  put(bytes: Uint8Array, meta: ScreenshotMeta): Promise<{ id: string }>;

  /** Return the blob + meta for an id, or null if unknown. */
  get(id: string): Promise<ScreenshotBlob | null>;
}
