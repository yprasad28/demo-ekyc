import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth";
import { PLATFORM_OWNER_ID } from "@/lib/constants";

/**
 * GET /api/wallet/balance
 *
 * Returns the platform owner's wallet balance and free credits.
 * Admin authentication required.
 *
 * Response:
 * {
 *   success: true,
 *   balance: 50000,
 *   balanceFormatted: 500,
 *   freeCredits: { pan: 5, creditScore: 5, aadhaar: 5 },
 *   lowBalance: false,
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const auth = requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    const wallet = await db.findOrCreateWallet(PLATFORM_OWNER_ID);

    return NextResponse.json({
      success: true,
      balance: wallet.balance,
      balanceFormatted: wallet.balance / 100,
      freeCredits: {
        pan: wallet.freePan,
        creditScore: wallet.freeCreditScore,
        aadhaar: wallet.freeAadhaar,
      },
      lowBalance: wallet.balance < 10000,
    });
  } catch (error) {
    console.error("[wallet-balance] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
