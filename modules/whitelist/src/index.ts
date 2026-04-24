export type Whitelist = { allowedUsers: string[] };

export function isAllowed(
  userId: string | null | undefined,
  wl: Whitelist,
): boolean {
  return !!userId && wl.allowedUsers.includes(userId);
}
