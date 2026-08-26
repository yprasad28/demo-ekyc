import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, getClientIp } from "@/lib/auth";
import { createPaymentProvider } from "@/features/wallet/providers/factory";
import { WalletTopupSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limiter";
import { PLATFORM_OWNER_ID } from "@/lib/constants";

/**
 * POST /api/wallet/topup
 *
 * Creates a Razorpay order for platform wallet top-up.
 * Admin authentication required.
 *
 * Flow:
 * 1. Authenticate admin
 * 2. Validate amount
 * 3. Check idempotency
 * 4. Create Razorpay order
 * 5. Store order in DB
 * 6. Return order details for frontend Checkout.js
 */
export async function POST(req: NextRequest) {
  try {
    const auth = requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    const limiter = rateLimit(`wallet-topup:${PLATFORM_OWNER_ID}`, 5, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many top-up attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = WalletTopupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { amount, idempotencyKey } = parsed.data;

    const existingOrder = await db.findPaymentOrderByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      return NextResponse.json({
        success: true,
        orderId: existingOrder.razorpayOrderId,
        amount: existingOrder.amount,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        existing: true,
      });
    }

    const provider = createPaymentProvider();
    const receipt = `topup_owner_${Date.now()}`;

    const order = await provider.createOrder(amount, receipt, {
      customerId: PLATFORM_OWNER_ID,
      purpose: "platform_wallet_topup",
    });

    await db.createPaymentOrder(
      PLATFORM_OWNER_ID,
      order.orderId,
      amount,
      idempotencyKey
    );

    const ipAddress = getClientIp(req);
    await db.createAuditLog(
      PLATFORM_OWNER_ID,
      "PLATFORM_WALLET_TOPUP_INITIATED",
      `Order ${order.orderId} for ₹${amount / 100}`,
      ipAddress
    );

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId,
    });
  } catch (error) {
    console.error("[wallet-topup] Error:", error);
    return NextResponse.json(
      { error: "Failed to create top-up order. Please try again." },
      { status: 500 }
    );
  }
}
