import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth";
import { FREE_CREDITS, PLATFORM_OWNER_ID } from "@/lib/constants";

/**
 * GET /api/wallet/credits
 *
 * Returns remaining free credits for each KYC service for the platform owner.
 * Admin authentication required.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    const wallet = await db.findOrCreateWallet(PLATFORM_OWNER_ID);

    return NextResponse.json({
      success: true,
      credits: {
        pan: {
          remaining: wallet.freePan,
          total: FREE_CREDITS.PAN,
        },
        creditScore: {
          remaining: wallet.freeCreditScore,
          total: FREE_CREDITS.CREDIT_SCORE,
        },
        aadhaar: {
          remaining: wallet.freeAadhaar,
          total: FREE_CREDITS.AADHAAR,
        },
      },
    });
  } catch (error) {
    console.error("[wallet-credits] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
