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

/**
 * Test mode: skips auth in development.
 * Use for curl/Postman testing without JWT tokens.
 * NEVER use in production.
 */
const TEST_CUSTOMER_ID = "test-customer-001";

export function requireCustomerAuthOrTestMode(req: NextRequest): NextResponse | { customerId: string } {
  // SEC-01: NEVER allow test mode in production, even if NODE_ENV is misconfigured
  if (process.env.NODE_ENV === "production") {
    return requireCustomerAuth(req);
  }

  const testMode = req.headers.get("x-test-mode");
  if (testMode === "true" || testMode === "1") {
    return { customerId: TEST_CUSTOMER_ID };
  }
  return requireCustomerAuth(req);
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
    secure: true,
    sameSite: "lax",
    maxAge,
  });
}
