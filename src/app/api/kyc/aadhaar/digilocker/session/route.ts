import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerAuth, getClientIp, getUserAgent } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limiter";
import { createUIStreamSession } from "@/features/kyc/providers/decentro/aadhaar";
import { storeDigiLockerSession } from "@/lib/digilocker-session-store";

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const limiter = rateLimit(`digilocker-session:${customerId}`, 5, 10 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const { mobile } = await req.json().catch(() => ({}));

    const session = await createUIStreamSession(mobile);

    if (session.txnId) {
      await storeDigiLockerSession(session.txnId, customerId);
    }

    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    await db.createConsentLog(customerId, "AADHAAR_DIGILOCKER_CONSENT", true, ipAddress, userAgent);

    return NextResponse.json({
      success: true,
      txnId: session.txnId,
      sessionUrl: session.authorizationUrl,
    });
  } catch (error) {
    console.error("Error in DigiLocker session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
