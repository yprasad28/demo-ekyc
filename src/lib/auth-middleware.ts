import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./constants";

export interface CustomerPayload {
  customerId: string;
  mobile: string;
  role: string;
}

export interface AdminPayload {
  adminId: string;
  email: string;
  role: string;
  name: string;
}

export function verifyCustomerToken(req: NextRequest): CustomerPayload | null {
  const token = req.cookies.get("kyc_token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as CustomerPayload;
    if (!payload.customerId) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyAdminToken(req: NextRequest): AdminPayload | null {
  const token = req.cookies.get("admin_token")?.value || req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }) as AdminPayload;
    if (payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}
