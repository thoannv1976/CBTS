import Link from "next/link";
import { ChatWidget } from "@/components/ChatWidget";
import { Sparkles, Clock, ShieldCheck, BookOpen, ArrowRight } from "lucide-react";
import { adminDb } from "@/lib/firebaseAdmin";
import type { Faq } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getTopFaqs(): Promise<Faq[]> {
  try {
    const snap = await adminDb()
      .collection("faqs")
      .where("published", "==", true)
      .orderBy("clickCount", "desc")
      .limit(5)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Faq, "id">) }));
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const uni = process.env.NEXT_PUBLIC_UNIVERSITY_NAME || "Trường Đại học CBTS";
  const tagline = process.env.NEXT_PUBLIC_UNIVERSITY_TAGLINE || "Tư vấn tuyển sinh 24/7";
  const topFaqs = await getTopFaqs();

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16">
      <section className="grid lg:grid-cols-2 gap-10 items-center">
        <div className="animate-slide-up">
          <span className="badge mb-4">
            <Sparkles className="size-3.5" /> Hỗ trợ bởi AI Claude
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Chatbot tư vấn <span className="bg-gradient-to-r from-brand-600 to-purple-500 bg-clip-text text-transparent">tuyển sinh thông minh</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            {uni} ra mắt trợ lý AI giúp bạn tra cứu nhanh thông tin về ngành học, học phí, điểm chuẩn, học bổng và quy trình nộp hồ sơ — {tagline.toLowerCase()}.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2"><Clock className="size-4 text-brand-600" /> Trả lời tức thì</div>
            <div className="flex items-center gap-2"><BookOpen className="size-4 text-brand-600" /> Cập nhật từ kho tri thức của trường</div>
            <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-brand-600" /> An toàn, riêng tư</div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link href="/faq" className="btn-outline">
              Xem câu hỏi thường gặp <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>

        <div className="animate-fade-in">
          <div className="glass rounded-3xl p-3 sm:p-4">
            <ChatWidget />
          </div>
        </div>
      </section>

      {topFaqs.length > 0 && (
        <section className="mt-16">
          <div className="flex items-end justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900">Top câu hỏi được quan tâm nhất</h2>
            <Link href="/faq" className="text-brand-700 text-sm font-medium hover:underline">Xem tất cả →</Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {topFaqs.map((f) => (
              <Link
                key={f.id}
                href={`/faq#faq-${f.id}`}
                className="card p-4 hover:border-brand-300 hover:shadow-md transition group"
              >
                <div className="text-xs text-brand-700 font-medium uppercase tracking-wide">{f.category || "Tổng quát"}</div>
                <div className="mt-1 font-semibold text-slate-800 group-hover:text-brand-700">{f.question}</div>
                <div className="mt-2 text-xs text-slate-500">{f.clickCount.toLocaleString("vi-VN")} lượt xem</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
