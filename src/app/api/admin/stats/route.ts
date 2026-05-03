import { NextRequest, NextResponse } from "next/server";
import { adminDb, requireAdmin } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await requireAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = adminDb();

  const [faqsSnap, kbSnap, convSnap, statsSnap] = await Promise.all([
    db.collection("faqs").get(),
    db.collection("knowledge").get(),
    db.collection("conversations").get(),
    db.collection("stats").orderBy("__name__", "desc").limit(14).get(),
  ]);

  let totalClicks = 0;
  const topFaqs = faqsSnap.docs
    .map((d) => {
      const data = d.data() as { question: string; clickCount?: number; category?: string; published?: boolean };
      totalClicks += data.clickCount ?? 0;
      return {
        id: d.id,
        question: data.question,
        category: data.category,
        clickCount: data.clickCount ?? 0,
        published: data.published !== false,
      };
    })
    .sort((a, b) => b.clickCount - a.clickCount)
    .slice(0, 10);

  const daily = statsSnap.docs
    .map((d) => ({
      id: d.id,
      conversations: (d.get("conversations") as number) || 0,
      messages: (d.get("messages") as number) || 0,
      faqClicks: (d.get("faqClicks") as number) || 0,
    }))
    .reverse();

  return NextResponse.json({
    totals: {
      faqs: faqsSnap.size,
      knowledge: kbSnap.size,
      conversations: convSnap.size,
      faqClicks: totalClicks,
    },
    topFaqs,
    daily,
  });
}
