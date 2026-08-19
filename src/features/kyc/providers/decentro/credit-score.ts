import { decentroRequest } from "./client";
import {
  CREDIT_SCORE_EXCELLENT,
  CREDIT_SCORE_GOOD,
  CREDIT_SCORE_FAIR,
} from "@/lib/constants";

export interface CreditScoreResult {
  score: number;
  bureau: string;
  reportDate: string;
  riskCategory: string;
}

function getScoreCategory(score: number): string {
  if (score >= CREDIT_SCORE_EXCELLENT) return "EXCELLENT";
  if (score >= CREDIT_SCORE_GOOD) return "GOOD";
  if (score >= CREDIT_SCORE_FAIR) return "FAIR";
  return "POOR";
}

// ─── Mock Credit Score for Demo ──────────────────────────────────────────────
// Returns a simulated credit score based on mobile number hash
// Used when CREDIT_SCORE_PROVIDER=mock
function getMockCreditScore(name: string, mobile: string): CreditScoreResult {
  // Generate a deterministic score based on mobile number
  const mobileHash = mobile.split("").reduce((acc, digit) => acc + parseInt(digit), 0);
  const baseScore = 650 + (mobileHash % 200); // Score between 650-849
  const score = Math.min(900, Math.max(300, baseScore));

  console.log(`[credit-score] 🎭 MOCK MODE: Returning simulated score ${score} for ${name}`);

  return {
    score,
    bureau: "Equifax (Mock)",
    reportDate: new Date().toISOString(),
    riskCategory: getScoreCategory(score),
  };
}

export async function fetchCreditScore(
  name: string,
  mobile: string
): Promise<CreditScoreResult> {
  // Check if mock mode is enabled
  const provider = process.env.CREDIT_SCORE_PROVIDER || "mock";
  if (provider === "mock") {
    return getMockCreditScore(name, mobile);
  }

  // Real Decentro API call
  const result = await decentroRequest("/v2/bytes/credit-score", {
    mobile,
    name,
  });

  // Rate limit hit
  if (result.responseCode === "429" || result.responseKey === "rate_limit_exceeded") {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  // No credit history found (responseCode E00058)
  if (result.responseCode === "E00058") {
    throw new Error("NO_CREDIT_HISTORY");
  }

  // API error
  if (result.status !== "SUCCESS") {
    const errorMsg = result.message || result.error?.message || "Failed to fetch credit score";
    throw new Error(errorMsg);
  }

  const data = result.data as Record<string, unknown> | undefined;
  if (!data) {
    throw new Error("No data received from credit bureau");
  }

  // ─── Format 1: scoreDetails array (Credit Score response) ─────────────
  const scoreDetails = data.scoreDetails as Record<string, unknown>[] | undefined;
  const scoreValue = scoreDetails?.[0]?.score;
  if (scoreValue) {
    const score = Number(scoreValue);
    return {
      score,
      bureau: "Equifax",
      reportDate: new Date().toISOString(),
      riskCategory: getScoreCategory(score),
    };
  }

  // ─── Format 2: cCRResponse (Credit Report response) ──────────────────
  const cCRResponse = data.cCRResponse as Record<string, unknown> | undefined;
  if (cCRResponse) {
    const reportList = cCRResponse.cIRReportDataLst as Record<string, unknown>[] | undefined;
    const firstEntry = reportList?.[0] as Record<string, unknown> | undefined;
    const error = firstEntry?.error as Record<string, unknown> | undefined;

    // "Consumer not found in bureau" (errorCode "00")
    if (error?.errorCode === "00" || error?.errorDesc?.toString().toLowerCase().includes("consumer not found")) {
      throw new Error("NO_CREDIT_HISTORY");
    }

    // Try to extract score from report data if available
    const scoreField = firstEntry?.score || firstEntry?.creditScore || firstEntry?.totalScore;
    if (scoreField) {
      const score = Number(scoreField);
      return {
        score,
        bureau: "Equifax",
        reportDate: new Date().toISOString(),
        riskCategory: getScoreCategory(score),
      };
    }
  }

  // No score found in any format
  throw new Error("NO_CREDIT_HISTORY");
}
