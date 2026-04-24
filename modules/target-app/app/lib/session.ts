/**
 * Mock session — stands in for whatever auth the host app actually uses.
 * Production hosts replace this with NextAuth / Clerk / a custom cookie check.
 * The only contract is: return `{ id }` for the current user, or null.
 */
export function getCurrentUser(): { id: string } | null {
  return { id: "admin@example.com" };
}
