import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./constants";

export interface CustomerPayload {
  customerId: string;
  mobile: string;
  role: string;
}

export interface AdminPayload {
  adminId: string;
  email: string;
  role: string;
  name: string;
}

export function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for") || req.ip || "127.0.0.1";
}

export function getUserAgent(req: NextRequest): string | null {
  return req.headers.get("user-agent") || null;
}

export function verifyCustomerToken(req: NextRequest): CustomerPayload | null {
  const token = req.cookies.get("kyc_token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as CustomerPayload;
    if (!payload.customerId) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyAdminToken(req: NextRequest): AdminPayload | null {
  const token = req.cookies.get("admin_token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminPayload;
    if (payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

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
