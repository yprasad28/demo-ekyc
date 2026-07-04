import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const auth = requireAdminAuth(req);
    if (auth instanceof NextResponse) return auth;

    const applications = await db.listApplications();

    const stats = {
      total: applications.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pending: applications.filter((a: any) => a.status === "PENDING").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inProgress: applications.filter((a: any) => a.status === "IN_PROGRESS").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      underReview: applications.filter((a: any) => a.status === "UNDER_REVIEW").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      approved: applications.filter((a: any) => a.status === "APPROVED").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rejected: applications.filter((a: any) => a.status === "REJECTED").length,
    };

    return NextResponse.json({ success: true, stats, applications });
  } catch (error) {
    console.error("Error in admin stats:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
