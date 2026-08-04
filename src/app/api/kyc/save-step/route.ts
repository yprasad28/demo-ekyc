import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TOTAL_STEPS } from "@/lib/constants";
import { requireCustomerAuth } from "@/lib/auth";
import { SaveStepSchema } from "@/lib/validators";
import { computeCombinedScore } from "@/lib/name-match";

const ALLOWED_STEP_FIELDS = [
  "aadhaarNumber", "aadhaarName", "aadhaarDob", "aadhaarGender",
  "aadhaarAddress", "aadhaarPhoto",
  "panNumber", "panName", "panDob", "panType",
];

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const body = await req.json();
    const parsed = SaveStepSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { step, data } = parsed.data;

    console.log("[save-step POST] customerId:", customerId, "step:", step);
    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) {
      console.error("[save-step POST] Application not found for customerId:", customerId);
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    const updates: Record<string, unknown> = { currentStep: step };
    if (data) {
      for (const key of ALLOWED_STEP_FIELDS) {
        if (key in data) {
          updates[key] = data[key];
        }
      }
      if (typeof data.email === "string" && data.email) {
        await db.updateCustomerEmail(customerId, data.email);
      }
    }

    if (step >= TOTAL_STEPS) {
      updates.status = "UNDER_REVIEW";
      updates.submittedAt = new Date().toISOString();
    } else if (step > 1) {
      updates.status = "IN_PROGRESS";
    }

    await db.updateApplication(application.id, updates);

    return NextResponse.json({ success: true, currentStep: step });
  } catch (error) {
    console.error("Error in save-step:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const documents = await db.findDocumentsByApplicationId(application.id);

    // Recompute name+DOB match score if we have both names but score is stale/missing
    if (application.aadhaarName && application.panName && (!application.panMatchScore || application.panMatchScore === 0)) {
      const recomputedScore = computeCombinedScore(
        application.aadhaarName,
        application.panName,
        application.aadhaarDob || "",
        application.panDob || ""
      );
      console.log("[save-step] Recomputed match score:", recomputedScore,
        "| aadhaar:", application.aadhaarName, "| pan:", application.panName,
        "| aadhaarDob:", application.aadhaarDob, "| panDob:", application.panDob);
      // Set on local object FIRST so response always has correct score
      application.panMatchScore = recomputedScore;
      // DB update is fire-and-forget — don't let it block the response
      db.updateApplication(application.id, { panMatchScore: recomputedScore }).catch((e) =>
        console.error("[save-step] Failed to persist recomputed score:", e)
      );
    }

    return NextResponse.json({ success: true, application, documents });
  } catch (error) {
    console.error("Error in get-step:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
