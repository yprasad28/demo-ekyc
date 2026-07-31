import { NextRequest, NextResponse } from "next/server";
import { requireCustomerAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (application.aadhaarName) {
      return NextResponse.json({
        success: true,
        found: true,
        aadhaarData: {
          name: application.aadhaarName,
          dob: application.aadhaarDob || "",
          gender: application.aadhaarGender || "M",
          address: application.aadhaarAddress || "",
          maskedAadhaar: application.aadhaarNumber || "",
          photo: application.aadhaarPhoto || "",
        },
      });
    }

    return NextResponse.json({ success: true, found: false });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    console.error("[Fetch Aadhaar] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
