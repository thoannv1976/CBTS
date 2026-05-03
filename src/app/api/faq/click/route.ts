import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { todayKey } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Thiếu id FAQ" }, { status: 400 });
    }
    const db = adminDb();
    const ref = db.collection("faqs").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await ref.update({
      clickCount: FieldValue.increment(1),
      lastClickedAt: Date.now(),
    });
    await db.collection("stats").doc(todayKey()).set(
      { faqClicks: FieldValue.increment(1), updatedAt: Date.now() },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
