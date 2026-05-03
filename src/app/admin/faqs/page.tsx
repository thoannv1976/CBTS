"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Eye, EyeOff, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { Faq } from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

const empty: Partial<Faq> = { question: "", answer: "", category: "Khác", published: true };

export default function FaqsAdminPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Faq[]>([]);
  const [editing, setEditing] = useState<Partial<Faq> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    if (!isAdmin) return;
    const data = await apiFetch<{ items: Faq[] }>("/api/admin/faqs");
    setItems(data.items);
  }

  useEffect(() => { load(); }, [isAdmin]);

  async function save() {
    if (!editing?.question || !editing?.answer) {
      setError("Cần nhập câu hỏi và câu trả lời");
      return;
    }
    setError(null);
    if (editing.id) {
      await apiFetch("/api/admin/faqs", { method: "PUT", body: JSON.stringify(editing) });
    } else {
      await apiFetch("/api/admin/faqs", { method: "POST", body: JSON.stringify(editing) });
    }
    setEditing(null);
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Xoá FAQ này?")) return;
    await apiFetch("/api/admin/faqs", { method: "DELETE", body: JSON.stringify({ id }) });
    await load();
  }

  async function togglePublished(it: Faq) {
    await apiFetch("/api/admin/faqs", {
      method: "PUT",
      body: JSON.stringify({ id: it.id, published: !it.published }),
    });
    await load();
  }

  async function generate() {
    setGenerating(true);
    setMsg(null);
    try {
      const data = await apiFetch<{ analyzedQuestions: number; created: { id: string }[] }>(
        "/api/admin/generate-faqs",
        { method: "POST" },
      );
      setMsg(`Đã tạo ${data.created.length} FAQ mới (trạng thái nháp) từ ${data.analyzedQuestions} câu hỏi gần đây.`);
      await load();
    } catch (e) {
      setMsg(`❌ ${(e as Error).message}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Câu hỏi thường gặp</h1>
          <p className="text-sm text-slate-600">Duyệt, chỉnh sửa và xuất bản các FAQ — bao gồm cả những FAQ do AI tự tổng hợp.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={generate} disabled={generating} className="btn-outline text-sm">
            <Sparkles className="size-4" /> {generating ? "Đang phân tích…" : "Tạo bằng AI"}
          </button>
          <button onClick={() => setEditing({ ...empty })} className="btn-primary text-sm">
            <Plus className="size-4" /> Thêm FAQ
          </button>
        </div>
      </div>

      {msg && <div className="card p-4 text-sm bg-brand-50/60 border-brand-200 text-brand-900">{msg}</div>}

      {editing && (
        <div className="card p-5 space-y-3 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">{editing.id ? "Cập nhật" : "Thêm"} FAQ</h2>
            <button onClick={() => setEditing(null)} className="btn-ghost text-sm"><X className="size-4" /></button>
          </div>
          <input
            className="input"
            placeholder="Câu hỏi"
            value={editing.question || ""}
            onChange={(e) => setEditing({ ...editing, question: e.target.value })}
          />
          <input
            className="input"
            placeholder="Phân loại"
            value={editing.category || ""}
            onChange={(e) => setEditing({ ...editing, category: e.target.value })}
          />
          <textarea
            className="input min-h-[180px]"
            placeholder="Câu trả lời (Markdown được hỗ trợ)"
            value={editing.answer || ""}
            onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
          />
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editing.published !== false}
              onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
            />
            Hiển thị công khai trên trang FAQ
          </label>
          {error && <div className="text-sm text-rose-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="btn-ghost text-sm">Huỷ</button>
            <button onClick={save} className="btn-primary text-sm"><Save className="size-4" /> Lưu</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="card p-4 flex gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-wide text-brand-700 font-semibold">{it.category || "Khác"}</span>
                {it.published ? (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded px-1.5 py-0.5">Đã xuất bản</span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">Nháp</span>
                )}
                <span className="text-[10px] text-slate-500">• {it.clickCount.toLocaleString("vi-VN")} lượt xem</span>
              </div>
              <div className="font-semibold text-slate-800 mt-1">{it.question}</div>
              <div className="text-sm text-slate-600 mt-1">{truncate(it.answer, 220)}</div>
              <div className="text-xs text-slate-400 mt-2">Cập nhật: {formatDate(it.updatedAt)}</div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button className="btn-ghost text-sm" onClick={() => togglePublished(it)} title={it.published ? "Ẩn" : "Hiện"}>
                {it.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              <button className="btn-ghost text-sm" onClick={() => setEditing(it)}><Pencil className="size-4" /></button>
              <button className="btn-ghost text-sm text-rose-600" onClick={() => remove(it.id)}><Trash2 className="size-4" /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="card p-8 text-center text-slate-500 text-sm">Chưa có FAQ nào.</div>
        )}
      </div>
    </div>
  );
}
