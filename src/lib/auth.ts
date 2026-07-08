import { NextRequest, NextResponse } from "next/server";
import { verifyCustomerToken, verifyAdminToken, CustomerPayload, AdminPayload } from "./auth-middleware";

export type { CustomerPayload, AdminPayload };

export function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";
}

export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get("user-agent") || null;
}

export { verifyCustomerToken, verifyAdminToken };

export function requireCustomerAuth(req: NextRequest): NextResponse | { customerId: string } {
  const payload = verifyCustomerToken(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { customerId: payload.customerId };
}

export function requireAdminAuth(req: NextRequest): NextResponse | AdminPayload {
  const payload = verifyAdminToken(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return payload;
}

export function setAuthCookie(response: NextResponse, cookieName: string, token: string, maxAge: number): void {
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
  });
}
