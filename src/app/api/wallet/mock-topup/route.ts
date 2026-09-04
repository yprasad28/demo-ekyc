import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth";
import { PLATFORM_OWNER_ID } from "@/lib/constants";

const MOCK_AMOUNTS = [50000, 100000, 500000, 1000000]; // 500, 1000, 5000, 10000 in paise

/**
 * POST /api/wallet/mock-topup
 *
 * Adds mock funds to the platform wallet for development/testing.
 * Blocked in production. Admin auth required.
 */
export async function POST(req: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Mock top-up is not available in production." }, { status: 403 });
    }

    const auth = requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number" || amount < 100 || amount > 10000000) {
      return NextResponse.json(
        { error: "Invalid amount. Must be between 1 and 100000 rupees." },
        { status: 400 }
      );
    }

    const wallet = await db.findOrCreateWallet(PLATFORM_OWNER_ID);
    if (!wallet) {
      return NextResponse.json({ error: "Platform wallet not found." }, { status: 404 });
    }

    const updatedWallet = await db.creditWalletBalance(wallet.id, amount);

    await db.createWalletTransaction(
      wallet.id,
      "TOPUP",
      amount,
      updatedWallet.balance,
      null,
      `Mock top-up for testing (₹${amount / 100})`,
      JSON.stringify({ mock: true, timestamp: new Date().toISOString() })
    );

    return NextResponse.json({
      success: true,
      message: `₹${amount / 100} added to platform wallet (mock).`,
      balance: updatedWallet.balance,
      balanceFormatted: updatedWallet.balance / 100,
    });
  } catch (error) {
    console.error("[mock-topup] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}