import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOTP } from "@/lib/mock-otp";
import { requireCustomerAuth, getClientIp, getUserAgent } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const limiter = rateLimit(`aadhaar-otp-send:${customerId}`, 3, 10 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": "600" } }
      );
    }

    const otp = generateOTP(`aadhaar-${customerId}`);
    console.log(`[UIDAI MOCK] Aadhaar OTP [${otp}] sent for customer [${customerId}]`);

    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);
    await db.createConsentLog(customerId, "AADHAAR_UIDAI_CONSENT", true, ipAddress, userAgent);

    return NextResponse.json({
      success: true,
      message: "OTP sent to your Aadhaar-linked mobile number.",
      otp,
    });
  } catch (error) {
    console.error("Error in aadhaar otp-send:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
