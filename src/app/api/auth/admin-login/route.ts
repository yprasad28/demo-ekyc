import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { JWT_SECRET, ADMIN_TOKEN_MAX_AGE, ADMIN_TOKEN_EXPIRY } from "@/lib/constants";
import { setAuthCookie, getClientIp } from "@/lib/auth";

// Demo admin credentials (in production, store hashed passwords in DB)
const ADMIN_CREDENTIALS = [
  {
    email: "admin@securekyc.in",
    passwordHash: bcrypt.hashSync("Admin@1234", 10),
    id: "admin-001",
    name: "Super Admin",
    role: "ADMIN",
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const admin = ADMIN_CREDENTIALS.find((a) => a.email === email.toLowerCase().trim());
    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const isValid = bcrypt.compareSync(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: "ADMIN", name: admin.name },
      JWT_SECRET,
      { expiresIn: ADMIN_TOKEN_EXPIRY }
    );

    const ipAddress = getClientIp(req);
    await db.createAuditLog(admin.id, "ADMIN_LOGIN", `Admin login by ${email}`, ipAddress);

    const response = NextResponse.json({
      success: true,
      token,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });

    setAuthCookie(response, "admin_token", token, ADMIN_TOKEN_MAX_AGE);

    return response;
  } catch (error) {
    console.error("Error in admin-login:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
