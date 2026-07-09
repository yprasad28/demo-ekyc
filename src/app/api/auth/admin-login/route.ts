import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIp, setAuthCookie } from "@/lib/auth";
import { ADMIN_TOKEN_MAX_AGE, ADMIN_TOKEN_EXPIRY } from "@/lib/constants";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { rateLimit } from "@/lib/rate-limiter";

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

    const ip = getClientIp(req);
    const limiter = rateLimit(`admin-login:${ip}`, 3, 15 * 60 * 1000);
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Try again later." },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    }

    const admin = ADMIN_CREDENTIALS.find(a => a.email === email);
    if (!admin) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email, role: admin.role, name: admin.name },
      process.env.JWT_SECRET || "securekyc-demo-secret-key-2024",
      { expiresIn: ADMIN_TOKEN_EXPIRY }
    );

    await db.createAuditLog(admin.id, "ADMIN_LOGIN", `Admin login by ${email}`, ip);

    const response = NextResponse.json({
      success: true,
      admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
    });

    setAuthCookie(response, "admin_token", token, ADMIN_TOKEN_MAX_AGE);

    return response;
  } catch (error) {
    console.error("Error in admin-login:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
