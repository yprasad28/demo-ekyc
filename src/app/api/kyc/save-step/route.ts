import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TOTAL_STEPS } from "@/lib/constants";
import { requireCustomerAuth } from "@/lib/auth";
import { SaveStepSchema } from "@/lib/validators";

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

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    // VULN-03 FIX: Enforce sequential step progression
    const currentStep = application.currentStep || 1;
    // Steps 1-2 never call save-step; first real save is step 3.
    // DigiLocker verify may jump currentStep to 6/7 directly.
    const effectiveNextStep = Math.max(currentStep + 1, 3);
    if (step > effectiveNextStep) {
      return NextResponse.json({
        error: `Cannot skip steps. Expected step ${effectiveNextStep}, received ${step}.`,
        code: "STEP_SEQUENCE_VIOLATION",
        currentStep,
      }, { status: 422 });
    }

    // Never let currentStep go backwards (DigiLocker may have advanced it past this step)
    const updates: Record<string, unknown> = { currentStep: Math.max(step, currentStep) };
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

    return NextResponse.json({ success: true, application, documents });
  } catch (error) {
    console.error("Error in get-step:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
