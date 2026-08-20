import Razorpay from "razorpay";
import { razorpayConfig } from "@/lib/config/razorpay";

/**
 * Razorpay SDK Client
 *
 * Initializes the Razorpay SDK with credentials from env vars.
 * This is a singleton — imported once, used everywhere.
 *
 * Key point: Only keyId and keySecret are used here.
 * The publicKey goes to the frontend (Checkout.js).
 */

let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (razorpayInstance) return razorpayInstance;

  if (!razorpayConfig.keyId || !razorpayConfig.keySecret) {
    throw new Error(
      "Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
    );
  }

  razorpayInstance = new Razorpay({
    key_id: razorpayConfig.keyId,
    key_secret: razorpayConfig.keySecret,
  });

  return razorpayInstance;
}
