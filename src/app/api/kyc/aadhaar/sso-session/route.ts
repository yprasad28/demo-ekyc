import { NextRequest, NextResponse } from "next/server";
import { requireCustomerAuth, getClientIp, getUserAgent } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limiter";
import { initiateSSODigiLockerSession } from "@/features/kyc/providers/decentro/digilocker-sso";
import { storeDigiLockerSession } from "@/lib/digilocker-session-store";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const limiter = rateLimit(`sso-session:${customerId}`, 3, 10 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const session = await initiateSSODigiLockerSession();

    if (session.txnId) {
      storeDigiLockerSession(session.txnId, customerId);
    }

    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    await db.createConsentLog(customerId, "AADHAAR_SSO_DIGILOCKER_CONSENT", true, ipAddress, userAgent);

    return NextResponse.json({
      success: true,
      txnId: session.txnId,
      sessionUrl: session.sessionUrl,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[SSO Session] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
