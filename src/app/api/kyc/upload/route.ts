import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCustomerAuth, getClientIp } from "@/lib/auth";
import { MAX_FILE_SIZE } from "@/lib/constants";
import { uploadDocument } from "@/lib/supabase";
import { SUPABASE_BUCKET } from "@/lib/constants";

const VALID_DOC_TYPES = ["AADHAAR", "PAN", "PHOTO", "SIGNATURE"];

export async function POST(req: NextRequest) {
  try {
    const auth = requireCustomerAuth(req);
    if (auth instanceof NextResponse) return auth;
    const { customerId } = auth;

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const docType = formData.get("type") as string;

    if (!file) return NextResponse.json({ error: "File is required." }, { status: 400 });
    if (!docType || !VALID_DOC_TYPES.includes(docType.toUpperCase())) {
      return NextResponse.json({ error: "Invalid document type." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 5MB limit." }, { status: 400 });
    }

    const application = await db.findApplicationByCustomerId(customerId);
    if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${customerId}/${docType.toLowerCase()}/${fileName}`;
    const fileUrl = await uploadDocument(SUPABASE_BUCKET, filePath, buffer, file.name);

    const doc = await db.createDocument(
      application.id,
      docType.toUpperCase() as "AADHAAR" | "PAN" | "PHOTO" | "SIGNATURE",
      fileUrl,
      file.name
    );

    const ipAddress = getClientIp(req);
    await db.createAuditLog(customerId, "DOCUMENT_UPLOADED", `Document ${docType} uploaded: ${file.name}`, ipAddress);

    return NextResponse.json({
      success: true,
      document: { id: doc.id, type: doc.type, fileUrl: doc.fileUrl, fileName: doc.fileName },
    });
  } catch (error) {
    console.error("Error in document upload:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
