import { db } from "./db";
import { KYC_PRICING, PLATFORM_OWNER_ID } from "./constants";

type ServiceType = "PAN" | "AADHAAR" | "CREDIT_SCORE";

const PRICING_KEY: Record<ServiceType, keyof typeof KYC_PRICING> = {
  PAN: "PAN_BASIC",
  AADHAAR: "AADHAAR",
  CREDIT_SCORE: "CREDIT_SCORE",
};

interface DeductionResult {
  success: boolean;
  error?: string;
  usedFreeCredit?: boolean;
  walletId?: string;
  newBalance?: number;
}

interface RefundResult {
  success: boolean;
  error?: string;
}

/**
 * Deduct from PLATFORM OWNER wallet before a KYC verification.
 *
 * Flow:
 * 1. Find or create PLATFORM OWNER wallet (not customer wallet)
 * 2. Try free credit first (PAN: 5, Aadhaar: 5, Credit Score: 5)
 * 3. If no free credit → deduct from balance
 * 4. If insufficient balance → return error
 * 5. Record transaction for audit trail (includes customerId for reference)
 */
export async function deductForVerification(
  customerId: string,
  serviceType: ServiceType
): Promise<DeductionResult> {
  try {
    // Always deduct from platform owner's wallet
    const wallet = await db.findOrCreateWallet(PLATFORM_OWNER_ID);
    if (!wallet) {
      return { success: false, error: "Platform wallet not found." };
    }

    // Step 1: Try free credit first (from platform owner wallet)
    const usedFree = await db.useFreeCredit(PLATFORM_OWNER_ID, serviceType);
    if (usedFree) {
      await db.createWalletTransaction(
        wallet.id,
        "FREE_CREDIT_USE",
        0,
        wallet.balance,
        null,
        `Free ${serviceType} verification (customer: ${customerId})`,
        null
      );
      return { success: true, usedFreeCredit: true, walletId: wallet.id, newBalance: wallet.balance };
    }

    // Step 2: Deduct from platform owner's balance
    const pricingKey = PRICING_KEY[serviceType];
    const priceInPaise = KYC_PRICING[pricingKey].price * 100;
    const updatedWallet = await db.deductWalletBalance(wallet.id, priceInPaise);

    if (!updatedWallet) {
      return {
        success: false,
        error: `Insufficient platform balance. Required ₹${KYC_PRICING[pricingKey].price} for ${KYC_PRICING[pricingKey].label}. Please top up platform wallet.`,
      };
    }

    // Step 3: Record transaction with customer reference
    await db.createWalletTransaction(
      wallet.id,
      "KYC_DEDUCTION",
      -priceInPaise,
      updatedWallet.balance,
      null,
      `${KYC_PRICING[pricingKey].label} verification (customer: ${customerId})`,
      null
    );

    return {
      success: true,
      usedFreeCredit: false,
      walletId: wallet.id,
      newBalance: updatedWallet.balance,
    };
  } catch (error) {
    console.error(`[wallet-deduction] Error for ${serviceType}:`, error);
    return { success: false, error: "Wallet deduction failed. Please try again." };
  }
}

/**
 * Refund PLATFORM OWNER wallet after a failed KYC verification.
 *
 * If free credit was used → restore it
 * If balance was deducted → credit it back
 * Record refund transaction for audit trail
 */
export async function refundForVerification(
  customerId: string,
  serviceType: ServiceType,
  usedFreeCredit: boolean
): Promise<RefundResult> {
  try {
    // Always refund to platform owner's wallet
    const wallet = await db.findOrCreateWallet(PLATFORM_OWNER_ID);
    if (!wallet) {
      return { success: false, error: "Platform wallet not found for refund." };
    }

    if (usedFreeCredit) {
      await db.restoreFreeCredit(PLATFORM_OWNER_ID, serviceType);
      await db.createWalletTransaction(
        wallet.id,
        "FREE_CREDIT_RESTORE",
        0,
        wallet.balance,
        null,
        `Restored free ${serviceType} credit (customer: ${customerId}, verification failed)`,
        null
      );
    } else {
      const pricingKey = PRICING_KEY[serviceType];
      const priceInPaise = KYC_PRICING[pricingKey].price * 100;
      const refundedWallet = await db.creditWalletBalance(wallet.id, priceInPaise);

      if (refundedWallet) {
        await db.createWalletTransaction(
          wallet.id,
          "KYC_REFUND",
          priceInPaise,
          refundedWallet.balance,
          null,
          `Refund: ${KYC_PRICING[pricingKey].label} verification failed (customer: ${customerId})`,
          null
        );
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`[wallet-refund] Error for ${serviceType}:`, error);
    return { success: false, error: "Wallet refund failed. Please contact support." };
  }
}
