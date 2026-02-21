import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  adminId?: string;
  email?: string;
}

export const sessionOptions = {
  password: process.env.ADMIN_SESSION_SECRET as string,
  cookieName: "rr_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireAdminSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session.adminId) {
    throw new Error("Unauthorized");
  }
  return session;
}
