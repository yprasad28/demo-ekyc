import { z } from "zod";
import { WALLET } from "./constants";

export const MobileSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
});

export const MobileOtpSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile number"),
  otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const AadhaarVerifySchema = z.object({
  otp: z.string().length(6).regex(/^\d{6}$/),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
});

export const PanVerifySchema = z.object({
  panNumber: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN format"),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const AdminApplicationActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().min(10).max(500).optional(),
}).refine(
  (data) => data.action !== "REJECT" || !!data.rejectionReason,
  { message: "Rejection reason required when rejecting" }
);

export const SaveStepSchema = z.object({
  step: z.number().int().min(1).max(7),
  data: z.record(z.string(), z.unknown()).optional(),
});

// ─── Wallet & Payment Validators ──────────────────────────────────────────────

// Top-up request: amount must be within limits
export const WalletTopupSchema = z.object({
  amount: z.number()
    .int()
    .min(WALLET.MIN_TOPUP * 100, `Minimum top-up is ₹${WALLET.MIN_TOPUP}`)
    .max(WALLET.MAX_TOPUP * 100, `Maximum top-up is ₹${WALLET.MAX_TOPUP}`),
  idempotencyKey: z.string().uuid("Invalid idempotency key"),
});

// Payment verification: from Razorpay checkout callback
export const WalletVerifySchema = z.object({
  razorpayOrderId: z.string().min(1, "Order ID required"),
  razorpayPaymentId: z.string().min(1, "Payment ID required"),
  razorpaySignature: z.string().min(1, "Signature required"),
});

// Webhook event: from Razorpay server
export const RazorpayWebhookSchema = z.object({
  event: z.string().min(1),
  payload: z.object({
    payment: z.object({
      entity: z.record(z.string(), z.unknown()),
    }).optional(),
    order: z.object({
      entity: z.record(z.string(), z.unknown()),
    }).optional(),
    refund: z.object({
      entity: z.record(z.string(), z.unknown()),
    }).optional(),
  }),
});
