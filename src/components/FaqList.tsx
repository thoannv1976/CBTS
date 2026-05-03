"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown, Eye, Search } from "lucide-react";
import type { Faq } from "@/lib/types";

interface Props {
  faqs: Faq[];
  categories: string[];
}

export function FaqList({ faqs, categories }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("Tất cả");
  const [openId, setOpenId] = useState<string | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(faqs.map((f) => [f.id, f.clickCount])));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return faqs.filter((f) => {
      if (active !== "Tất cả" && (f.category || "Khác") !== active) return false;
      if (!q) return true;
      return (
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category?.toLowerCase().includes(q)
      );
    });
  }, [faqs, active, query]);

  async function handleOpen(id: string) {
    const next = openId === id ? null : id;
    setOpenId(next);
    if (next === id) {
      setCounts((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
      try {
        await fetch("/api/faq/click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
      } catch { /* ignore */ }
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm câu hỏi…"
            className="input pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["Tất cả", ...categories]).map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${
                active === c
                  ? "bg-brand-600 border-brand-600 text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-brand-300 hover:text-brand-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((f) => {
          const open = openId === f.id;
          return (
            <div key={f.id} id={`faq-${f.id}`} className="card overflow-hidden">
              <button
                onClick={() => handleOpen(f.id)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-slate-50"
              >
                <div className="flex-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-brand-700">
                    {f.category || "Tổng quát"}
                  </div>
                  <div className="font-semibold text-slate-800 mt-0.5">{f.question}</div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
                  <span className="inline-flex items-center gap-1"><Eye className="size-3.5" /> {(counts[f.id] ?? 0).toLocaleString("vi-VN")}</span>
                  <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                </div>
              </button>
              {open && (
                <div className="px-4 pb-4 -mt-1 border-t border-slate-100 pt-3 text-slate-700 text-sm leading-relaxed prose-chat animate-fade-in">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{f.answer}</ReactMarkdown>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="card p-8 text-center text-slate-500">Không tìm thấy câu hỏi phù hợp.</div>
        )}
      </div>
    </div>
  );
}
