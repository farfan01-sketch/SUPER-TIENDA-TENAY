import type { IUserPermissions, UserRole } from "./models/User";

export type SessionUser = {
  _id: string;
  username: string;
  role: UserRole;
  permissions: IUserPermissions;
};

export function parseSessionCookie(
  raw?: string | null
): SessionUser | null {
  if (!raw) return null;
  try {
    const json = decodeURIComponent(raw);
    const data = JSON.parse(json);
    if (!data || !data._id || !data.username) return null;
    return data as SessionUser;
  } catch {
    return null;
  }
}

export function buildSessionCookieValue(user: SessionUser): string {
  return encodeURIComponent(JSON.stringify(user));
}
