import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerAuthOrTestMode, getClientIp } from "@/lib/auth";
import { createPaymentProvider } from "@/features/wallet/providers/factory";
import { WalletTopupSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limiter";

/**
 * POST /api/wallet/topup
 *
 * Creates a Razorpay order for wallet top-up.
 *
 * Flow:
 * 1. Authenticate customer
 * 2. Validate amount (server-controlled, not from client)
 * 3. Check idempotency (prevent duplicate orders)
 * 4. Create Razorpay order
 * 5. Store order in DB
 * 6. Return order details for frontend Checkout.js
 *
 * Why this order matters:
 * - Amount validation prevents malicious users from paying ₹1 and crediting ₹1000
 * - Idempotency prevents double orders on retry
 * - DB record enables reconciliation
 */
export async function POST(req: NextRequest) {
  try {
    // Step 1: Authenticate (SEC-01: derive user from JWT, not client)
    const auth = requireCustomerAuthOrTestMode(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    // Rate limit: 5 top-up attempts per 15 minutes
    const limiter = rateLimit(`wallet-topup:${customerId}`, 5, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many top-up attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Step 2: Parse and validate request
    const body = await req.json();
    const parsed = WalletTopupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { amount, idempotencyKey } = parsed.data;

    // Step 3: Idempotency check (PAY-02: prevent duplicate orders)
    const existingOrder = await db.findPaymentOrderByIdempotencyKey(idempotencyKey);
    if (existingOrder) {
      // Return existing order — don't create a new one
      return NextResponse.json({
        success: true,
        orderId: existingOrder.razorpayOrderId,
        amount: existingOrder.amount,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        existing: true,
      });
    }

    // Step 4: Create Razorpay order
    const provider = createPaymentProvider();
    const receipt = `topup_${customerId.slice(0, 8)}_${Date.now()}`;

    const order = await provider.createOrder(amount, receipt, {
      customerId,
      purpose: "wallet_topup",
    });

    // Step 5: Store order in DB (for reconciliation)
    await db.createPaymentOrder(
      customerId,
      order.orderId,
      amount,
      idempotencyKey
    );

    // Step 6: Audit log
    const ipAddress = getClientIp(req);
    await db.createAuditLog(
      customerId,
      "WALLET_TOPUP_INITIATED",
      `Order ${order.orderId} for ₹${amount / 100}`,
      ipAddress
    );

    // Step 7: Return order for frontend
    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      keyId: order.keyId, // Public key for Checkout.js
    });
  } catch (error) {
    console.error("[wallet-topup] Error:", error);
    return NextResponse.json(
      { error: "Failed to create top-up order. Please try again." },
      { status: 500 }
    );
  }
}
