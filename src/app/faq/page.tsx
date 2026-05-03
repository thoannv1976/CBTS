import { adminDb } from "@/lib/firebaseAdmin";
import type { Faq } from "@/lib/types";
import { FaqList } from "@/components/FaqList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getFaqs(): Promise<Faq[]> {
  try {
    const snap = await adminDb()
      .collection("faqs")
      .where("published", "==", true)
      .orderBy("clickCount", "desc")
      .limit(200)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Faq, "id">) }));
  } catch {
    return [];
  }
}

export default async function FaqPage() {
  const faqs = await getFaqs();
  const categories = Array.from(new Set(faqs.map((f) => f.category || "Khác")));

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Câu hỏi thường gặp</h1>
        <p className="mt-2 text-slate-600">
          Tổng hợp những thắc mắc phổ biến nhất từ thí sinh và phụ huynh — kèm câu trả lời chính thức.
        </p>
      </div>

      {faqs.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <p>Chưa có câu hỏi thường gặp nào được công bố.</p>
          <p className="text-sm mt-2">Hãy thử trò chuyện trực tiếp với chatbot để được hỗ trợ ngay.</p>
        </div>
      ) : (
        <FaqList faqs={faqs} categories={categories} />
      )}
    </div>
  );
}
