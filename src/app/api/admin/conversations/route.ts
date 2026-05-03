import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const db = adminDb();

  if (id) {
    const conv = await db.collection("conversations").doc(id).get();
    const msgs = await db
      .collection("conversations").doc(id)
      .collection("messages").orderBy("createdAt", "asc").get();
    return NextResponse.json({
      conversation: conv.exists ? { id: conv.id, ...conv.data() } : null,
      messages: msgs.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  }

  const snap = await db
    .collection("conversations")
    .orderBy("lastMessageAt", "desc")
    .limit(100)
    .get();
  return NextResponse.json({
    items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
}
