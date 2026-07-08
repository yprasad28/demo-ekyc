import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth, getClientIp } from "@/lib/auth";
import { AdminApplicationActionSchema } from "@/lib/validators";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { adminId } = auth;

    const { id } = params;
    const body = await req.json();
    const parsed = AdminApplicationActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { action, rejectionReason } = parsed.data;

    const application = await db.findApplicationById(id);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const updates: Record<string, unknown> = {
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
    };

    if (action === "REJECT" && rejectionReason) {
      updates.rejectionReason = rejectionReason;
    }

    const updated = await db.updateApplication(id, updates);

    const ipAddress = getClientIp(req);
    await db.createAuditLog(
      adminId,
      action === "APPROVE" ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED",
      `Application ${id} ${action.toLowerCase()}d. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`,
      ipAddress
    );

    return NextResponse.json({ success: true, application: updated });
  } catch (error) {
    console.error("Error in admin application action:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = params;
    const application = await db.findApplicationById(id);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const documents = await db.findDocumentsByApplicationId(id);
    return NextResponse.json({ success: true, application, documents });
  } catch (error) {
    console.error("Error in admin application get:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
