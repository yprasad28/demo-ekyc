import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOTP } from "@/lib/mock-otp";
import { getClientIp, getUserAgent } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limiter";
import { MobileSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = MobileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { mobile } = parsed.data;

    const ip = getClientIp(req);
    const limiter = rateLimit(`customer-login:${ip}`, 5, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    }

    const otp = generateOTP(mobile);

    const customer = await db.createCustomer(mobile);
    await db.createApplication(customer.id);

    const userAgent = getUserAgent(req);

    await db.createConsentLog(customer.id, "MOBILE_REGISTER_CONSENT", true, ip, userAgent);
    await db.createAuditLog(customer.id, "OTP_SENT", `OTP sent successfully to mobile ${mobile}`, ip);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully.",
      otp,
    });
  } catch (error: unknown) {
    console.error("Error in customer-login:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
