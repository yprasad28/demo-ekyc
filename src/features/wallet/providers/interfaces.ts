/**
 * Payment Provider Interface
 *
 * Defines the contract for payment operations.
 * Any provider (Razorpay, Mock, Stripe) must implement these methods.
 *
 * Why an interface?
 * - Enables switching providers via env var (Provider Pattern)
 * - Makes testing easy (mock provider for dev, real for prod)
 * - Clear contract for what each provider must do
 */

export interface CreateOrderResult {
  orderId: string;        // Razorpay order ID
  amount: number;         // Amount in paise
  currency: string;
  keyId: string;          // Public key for frontend
}

export interface VerifyPaymentResult {
  verified: boolean;
  orderId: string;
  paymentId: string;
  amount: number;
  status: string;
}

export interface PaymentProvider {
  /**
   * Create a payment order
   * @param amount - Amount in paise (₹500 = 50000)
   * @param receipt - Unique receipt string for idempotency
   * @param metadata - Extra data to attach to order
   */
  createOrder(
    amount: number,
    receipt: string,
    metadata?: Record<string, string>
  ): Promise<CreateOrderResult>;

  /**
   * Verify a payment signature from checkout callback
   * @param orderId - Razorpay order ID
   * @param paymentId - Razorpay payment ID
   * @param signature - Signature from checkout callback
   */
  verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string
  ): Promise<VerifyPaymentResult>;

  /**
   * Verify webhook signature
   * @param rawBody - Raw request body (Buffer or string)
   * @param signature - X-Razorpay-Signature header
   */
  verifyWebhookSignature(
    rawBody: string | Buffer,
    signature: string
  ): boolean;

  /**
   * Fetch payment details from Razorpay
   * @param paymentId - Razorpay payment ID
   */
  fetchPayment(paymentId: string): Promise<{
    id: string;
    amount: number;
    status: string;
    orderId: string;
  }>;
}
