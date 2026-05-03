import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireAdmin } from "@/lib/firebaseAdmin";
import type { Faq } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const snap = await adminDb().collection("faqs").orderBy("clickCount", "desc").limit(500).get();
  const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Faq, "id">) }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as Partial<Faq>;
  if (!body.question || !body.answer) {
    return NextResponse.json({ error: "Thiếu nội dung" }, { status: 400 });
  }
  const now = Date.now();
  const doc = {
    question: String(body.question).slice(0, 500),
    answer: String(body.answer).slice(0, 8000),
    category: String(body.category || "Tổng quát").slice(0, 100),
    clickCount: typeof body.clickCount === "number" ? body.clickCount : 0,
    published: body.published !== false,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await adminDb().collection("faqs").add(doc);
  return NextResponse.json({ id: ref.id, ...doc });
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = (await req.json()) as Partial<Faq> & { id?: string };
  if (!body.id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  const update: Record<string, unknown> = { updatedAt: Date.now() };
  for (const k of ["question", "answer", "category", "published", "clickCount"] as const) {
    if (body[k] !== undefined) update[k] = body[k];
  }
  await adminDb().collection("faqs").doc(body.id).set(update, { merge: true });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = (await req.json()) as { id?: string };
  if (!id) return NextResponse.json({ error: "Thiếu id" }, { status: 400 });
  await adminDb().collection("faqs").doc(id).delete();
  return NextResponse.json({ ok: true });
}
