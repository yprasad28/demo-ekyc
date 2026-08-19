import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerAuth } from "@/lib/auth";
import { fetchCreditScore } from "@/features/kyc/providers/decentro/credit-score";

// ─── Simulation Profiles (Decentro Staging Test Data) ────────────────────────
// Used for testing when Aadhaar name doesn't match the test profile name.
// Matches by mobile number OR name (case-insensitive).
const SIMULATION_PROFILES = [
  { name: "SATHISH KUMAR", mobile: "8122244473", score: 782, category: "EXCELLENT" },
  { name: "KARAN RAI", mobile: "9811610706", score: 715, category: "GOOD" },
  { name: "SHETTY SUDHIR", mobile: "9820140097", score: 845, category: "EXCELLENT" },
  { name: "ASHOK KUMAR SAINI", mobile: "8107600161", score: 658, category: "FAIR" },
  { name: "OMRAKASH GULAPPA BISNAL", mobile: "9019765828", score: 698, category: "FAIR" },
  { name: "Darshan Govardhan", mobile: "9996889976", score: 731, category: "GOOD" },
];

function getScoreCategory(score: number): string {
  if (score >= 750) return "EXCELLENT";
  if (score >= 700) return "GOOD";
  if (score >= 650) return "FAIR";
  return "POOR";
}

function findSimulationProfile(name: string, mobile: string) {
  const cleanMobile = mobile.replace(/\D/g, "");
  return SIMULATION_PROFILES.find(
    (p) =>
      p.name.toLowerCase() === name.toLowerCase() &&
      p.mobile === cleanMobile
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    // Get customer and application from DB
    const customer = await db.findCustomerById(customerId);
    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    // Get name from Aadhaar data (required for credit score API)
    const name = application.aadhaarName;
    if (!name) {
      return NextResponse.json(
        { error: "Aadhaar verification required before fetching credit score." },
        { status: 400 }
      );
    }

    const mobile = customer.mobile;
    if (!mobile) {
      return NextResponse.json(
        { error: "Mobile number not found." },
        { status: 400 }
      );
    }

    // ─── Check provider mode ───────────────────────────────────────────────
    const provider = process.env.CREDIT_SCORE_PROVIDER || "mock";
    const isMockMode = provider === "mock";

    if (isMockMode) {
      console.log(`[credit-score] 🎭 MOCK MODE: Using simulated credit score`);
    } else {
      // ─── Check for simulation data match (real API mode) ──────────────────
      const simProfile = findSimulationProfile(name, mobile);
      if (simProfile) {
        console.log(`[credit-score] 🎯 MATCH → calling REAL API with: name="${simProfile.name}" mobile="${simProfile.mobile}"`);
      } else {
        console.log(`[credit-score] 🚀 NO MATCH → calling REAL API with: name="${name}" mobile="${mobile}"`);
      }
    }

    // ─── Fetch credit score (mock or real) ────────────────────────────────
    let result;
    try {
      result = await fetchCreditScore(name, mobile);
      console.log(`[credit-score] ✅ SUCCESS: score=${result.score} bureau=${result.bureau} category=${result.riskCategory}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.log(`[credit-score] ❌ ERROR: ${errorMessage}`);

      if (errorMessage === "NO_CREDIT_HISTORY") {
        return NextResponse.json({
          success: true,
          noHistory: true,
          message: "No credit history found for this customer.",
        });
      }

      if (errorMessage === "RATE_LIMIT_EXCEEDED") {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }

      console.error("[credit-score] API error:", errorMessage);
      return NextResponse.json(
        { error: "Unable to fetch credit score. Please try again." },
        { status: 500 }
      );
    }

    // Store result in DB
    await db.updateApplication(application.id, {
      creditScore: result.score,
      creditScoreBureau: result.bureau,
      creditScoreDate: new Date(result.reportDate),
      creditScoreCategory: result.riskCategory,
    });

    return NextResponse.json({
      success: true,
      score: result.score,
      bureau: result.bureau,
      category: result.riskCategory,
      reportDate: result.reportDate,
    });
  } catch (error) {
    console.error("[credit-score] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      score: application.creditScore || null,
      bureau: application.creditScoreBureau || null,
      category: application.creditScoreCategory || null,
      reportDate: application.creditScoreDate || null,
    });
  } catch (error) {
    console.error("[credit-score GET] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
