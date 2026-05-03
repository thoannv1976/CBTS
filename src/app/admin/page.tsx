"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, ListTree, MessageSquare, RefreshCcw, Sparkles, TrendingUp } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";

interface Stats {
  totals: { faqs: number; knowledge: number; conversations: number; faqClicks: number };
  topFaqs: { id: string; question: string; category?: string; clickCount: number; published: boolean }[];
  daily: { id: string; conversations: number; messages: number; faqClicks: number }[];
}

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [gMessage, setGMessage] = useState<string | null>(null);

  async function load() {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await apiFetch<Stats>("/api/admin/stats");
      setStats(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [isAdmin]);

  async function generate() {
    setGenerating(true);
    setGMessage(null);
    try {
      const data = await apiFetch<{ analyzedQuestions: number; created: { id: string; question: string }[] }>(
        "/api/admin/generate-faqs",
        { method: "POST" },
      );
      setGMessage(
        `Đã phân tích ${data.analyzedQuestions} câu hỏi, tạo mới ${data.created.length} FAQ (đang ở trạng thái nháp). ` +
        `Vào tab "Câu hỏi thường gặp" để duyệt và xuất bản.`,
      );
      await load();
    } catch (e) {
      setGMessage(`❌ ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tổng quan</h1>
          <p className="text-slate-600 text-sm">Theo dõi hoạt động chatbot và quản lý kho tri thức.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-outline text-sm" disabled={loading}>
            <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
          </button>
          <button onClick={generate} className="btn-primary text-sm" disabled={generating}>
            <Sparkles className="size-4" /> {generating ? "Đang phân tích…" : "Tạo FAQ bằng AI"}
          </button>
        </div>
      </div>

      {gMessage && (
        <div className="card p-4 text-sm bg-brand-50/60 border-brand-200 text-brand-900">{gMessage}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<MessageSquare className="size-5" />} label="Hội thoại" value={stats?.totals.conversations ?? 0} hue="brand" />
        <StatCard icon={<ListTree className="size-5" />} label="FAQ" value={stats?.totals.faqs ?? 0} hue="emerald" />
        <StatCard icon={<BookOpen className="size-5" />} label="Tri thức" value={stats?.totals.knowledge ?? 0} hue="purple" />
        <StatCard icon={<Eye className="size-5" />} label="Lượt xem FAQ" value={stats?.totals.faqClicks ?? 0} hue="amber" />
      </div>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="size-4 text-brand-600" /> Hoạt động 14 ngày qua
            </h2>
          </div>
          <Sparkline data={stats?.daily ?? []} />
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">Top FAQ được xem</h2>
            <Link href="/admin/faqs" className="text-xs text-brand-700 hover:underline">Quản lý →</Link>
          </div>
          <ul className="space-y-2">
            {(stats?.topFaqs || []).map((f, i) => (
              <li key={f.id} className="flex items-start gap-2 text-sm">
                <span className="size-6 grid place-items-center rounded-full bg-brand-50 text-brand-700 text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800 truncate">{f.question}</div>
                  <div className="text-xs text-slate-500">{f.category} · {f.clickCount.toLocaleString("vi-VN")} lượt</div>
                </div>
                {!f.published && <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">Nháp</span>}
              </li>
            ))}
            {(stats?.topFaqs?.length ?? 0) === 0 && (
              <li className="text-sm text-slate-500">Chưa có FAQ nào.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hue,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hue: "brand" | "emerald" | "purple" | "amber";
}) {
  const palette = {
    brand: "from-brand-500 to-brand-600 text-brand-50",
    emerald: "from-emerald-500 to-emerald-600 text-emerald-50",
    purple: "from-purple-500 to-purple-600 text-purple-50",
    amber: "from-amber-500 to-amber-600 text-amber-50",
  }[hue];
  return (
    <div className="card p-5">
      <div className={`size-10 rounded-xl bg-gradient-to-br ${palette} grid place-items-center shadow-md`}>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value.toLocaleString("vi-VN")}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Sparkline({ data }: { data: { id: string; conversations: number; messages: number; faqClicks: number }[] }) {
  if (data.length === 0) {
    return <div className="text-sm text-slate-500 py-8 text-center">Chưa có dữ liệu.</div>;
  }
  const max = Math.max(1, ...data.map((d) => Math.max(d.messages, d.conversations, d.faqClicks)));
  return (
    <div className="space-y-2">
      <Bars label="Tin nhắn" color="#1f5ff5" values={data.map((d) => d.messages)} max={max} />
      <Bars label="Hội thoại" color="#10b981" values={data.map((d) => d.conversations)} max={max} />
      <Bars label="Lượt xem FAQ" color="#f59e0b" values={data.map((d) => d.faqClicks)} max={max} />
      <div className="flex justify-between text-[10px] text-slate-400 pt-1">
        {data.map((d) => (
          <span key={d.id}>{d.id.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

function Bars({ label, color, values, max }: { label: string; color: string; values: number[]; max: number }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1 flex justify-between">
        <span>{label}</span>
        <span>{values.reduce((a, b) => a + b, 0).toLocaleString("vi-VN")}</span>
      </div>
      <div className="flex items-end gap-1 h-16">
        {values.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all"
            style={{ height: `${(v / max) * 100}%`, background: color, minHeight: 2, opacity: v ? 1 : 0.2 }}
            title={`${v}`}
          />
        ))}
      </div>
    </div>
  );
}
