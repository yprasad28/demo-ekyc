import crypto from "crypto";
import { getRazorpayClient } from "./client";
import { razorpayConfig } from "@/lib/config/razorpay";
import type { PaymentProvider, CreateOrderResult, VerifyPaymentResult } from "../interfaces";

/**
 * Razorpay Payment Provider
 *
 * Implements the PaymentProvider interface using Razorpay SDK.
 * Handles order creation, payment verification, and webhook verification.
 *
 * Security notes:
 * - Payment signature uses keySecret (different from webhook secret)
 * - Webhook signature uses webhookSecret (different from key secret)
 * - NEVER mix these two — it's a common source of bugs
 */
export class RazorpayPaymentProvider implements PaymentProvider {
  async createOrder(
    amount: number,
    receipt: string,
    metadata?: Record<string, string>
  ): Promise<CreateOrderResult> {
    const client = getRazorpayClient();

    const order = await client.orders.create({
      amount, // Already in paise
      currency: "INR",
      receipt,
      notes: metadata || {},
      // Auto-capture within 30 minutes (wallet top-ups are time-sensitive)
      payment: {
        capture: "automatic",
        capture_options: {
          automatic_expiry_period: 30, // minutes
          manual_expiry_period: 1440,  // 24 hours
          refund_speed: "optimum",
        },
      },
    });

    return {
      orderId: order.id,
      amount: order.amount as number,
      currency: order.currency,
      keyId: razorpayConfig.publicKey,
    };
  }

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<VerifyPaymentResult> {
    // Step 1: Verify signature (HMAC-SHA256)
    // Payload: orderId + "|" + paymentId
    // Key: keySecret (NOT webhookSecret)
    const expectedSignature = crypto
      .createHmac("sha256", razorpayConfig.keySecret)
      .update(orderId + "|" + paymentId)
      .digest("hex");

    const verified = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature, "hex")
    );

    if (!verified) {
      return {
        verified: false,
        orderId,
        paymentId,
        amount: 0,
        status: "SIGNATURE_INVALID",
      };
    }

    // Step 2: Fetch payment from Razorpay (belt + suspenders)
    const client = getRazorpayClient();
    const payment = await client.payments.fetch(paymentId);

    return {
      verified: true,
      orderId,
      paymentId,
      amount: payment.amount as number,
      status: payment.status,
    };
  }

  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string
  ): boolean {
    // Webhook uses a DIFFERENT secret than payment verification
    // Payload: raw body bytes (exact bytes Razorpay sent)
    // Key: webhookSecret (NOT keySecret)
    const expectedSignature = crypto
      .createHmac("sha256", razorpayConfig.webhookSecret)
      .update(rawBody)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature, "hex")
    );
  }

  async fetchPayment(paymentId: string) {
    const client = getRazorpayClient();
    const payment = await client.payments.fetch(paymentId);

    return {
      id: payment.id,
      amount: payment.amount as number,
      status: payment.status,
      orderId: payment.order_id as string,
    };
  }
}
