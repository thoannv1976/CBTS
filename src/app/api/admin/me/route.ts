import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const decoded = await requireAdmin(req);
  if (!decoded) return NextResponse.json({ isAdmin: false });
  return NextResponse.json({
    isAdmin: true,
    uid: decoded.uid,
    email: decoded.email,
    name: decoded.name ?? null,
  });
}
