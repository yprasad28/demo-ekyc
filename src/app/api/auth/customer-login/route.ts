import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOTP } from "@/lib/mock-otp";
import { MOBILE_REGEX } from "@/lib/constants";
import { getClientIp, getUserAgent } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mobile } = body;

    if (!mobile || !MOBILE_REGEX.test(mobile)) {
      return NextResponse.json(
        { error: "Invalid mobile number. Please provide a 10-digit number." },
        { status: 400 }
      );
    }

    const otp = generateOTP(mobile);

    const customer = await db.createCustomer(mobile);
    await db.createApplication(customer.id);

    const ipAddress = getClientIp(req);
    const userAgent = getUserAgent(req);

    await db.createConsentLog(customer.id, "MOBILE_REGISTER_CONSENT", true, ipAddress, userAgent);
    await db.createAuditLog(customer.id, "OTP_SENT", `OTP sent successfully to mobile ${mobile}`, ipAddress);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully.",
      otp: process.env.NODE_ENV === "development" ? otp : undefined
    });
  } catch (error: unknown) {
    console.error("Error in customer-login:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
