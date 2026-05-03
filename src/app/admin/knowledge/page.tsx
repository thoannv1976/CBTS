"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Upload, FileText } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getClientStorage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/components/AuthProvider";
import type { KnowledgeEntry } from "@/lib/types";
import { formatDate, truncate } from "@/lib/utils";

const empty: Partial<KnowledgeEntry> = { title: "", category: "", content: "", tags: [], source: "" };

export default function KnowledgePage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<KnowledgeEntry[]>([]);
  const [editing, setEditing] = useState<Partial<KnowledgeEntry> | null>(null);
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!isAdmin) return;
    const data = await apiFetch<{ items: KnowledgeEntry[] }>("/api/admin/knowledge");
    setItems(data.items);
  }

  useEffect(() => { load(); }, [isAdmin]);

  function startNew() {
    setEditing({ ...empty });
    setTagsInput("");
    setError(null);
  }
  function startEdit(e: KnowledgeEntry) {
    setEditing({ ...e });
    setTagsInput((e.tags || []).join(", "));
    setError(null);
  }
  function cancel() {
    setEditing(null);
    setError(null);
  }

  async function save() {
    if (!editing) return;
    if (!editing.title || !editing.content) {
      setError("Vui lòng nhập tiêu đề và nội dung.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...editing,
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };
      if (editing.id) {
        await apiFetch("/api/admin/knowledge", { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/api/admin/knowledge", { method: "POST", body: JSON.stringify(payload) });
      }
      setEditing(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Xoá mục tri thức này?")) return;
    await apiFetch("/api/admin/knowledge", { method: "DELETE", body: JSON.stringify({ id }) });
    await load();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    setError(null);
    try {
      const storage = getClientStorage();
      const path = `knowledge/${Date.now()}-${file.name}`;
      const r = ref(storage, path);
      await uploadBytes(r, file, { contentType: file.type });
      const url = await getDownloadURL(r);
      // For text files, also pull content into the editor.
      if (file.type.startsWith("text/")) {
        const text = await file.text();
        setEditing((prev) => ({ ...(prev || {}), fileUrl: url, content: (prev?.content || "") + (prev?.content ? "\n\n" : "") + text }));
      } else {
        setEditing((prev) => ({ ...(prev || {}), fileUrl: url }));
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kho tri thức</h1>
          <p className="text-sm text-slate-600">
            Nội dung ở đây sẽ được chatbot tham chiếu để trả lời. Hãy giữ thông tin chính xác và cập nhật.
          </p>
        </div>
        <button onClick={startNew} className="btn-primary text-sm">
          <Plus className="size-4" /> Thêm mục mới
        </button>
      </div>

      {editing && (
        <div className="card p-5 space-y-3 animate-fade-in">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">{editing.id ? "Cập nhật" : "Thêm mới"} tri thức</h2>
            <button onClick={cancel} className="btn-ghost text-sm"><X className="size-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Tiêu đề (vd: Học phí ngành CNTT 2025)"
              value={editing.title || ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <input
              className="input"
              placeholder="Phân loại (Tuyển sinh, Học phí, Học bổng…)"
              value={editing.category || ""}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
            />
          </div>
          <input
            className="input"
            placeholder="Tags, phân cách bằng dấu phẩy"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          <textarea
            className="input min-h-[220px] font-mono text-sm"
            placeholder="Nội dung (Markdown được hỗ trợ)"
            value={editing.content || ""}
            onChange={(e) => setEditing({ ...editing, content: e.target.value })}
          />
          <input
            className="input"
            placeholder="Nguồn / link tham chiếu (tuỳ chọn)"
            value={editing.source || ""}
            onChange={(e) => setEditing({ ...editing, source: e.target.value })}
          />

          <div className="flex items-center gap-3 flex-wrap">
            <label className="btn-outline text-sm cursor-pointer">
              <Upload className="size-4" />
              {uploading ? "Đang tải lên…" : "Đính kèm tệp (PDF, TXT, ảnh)"}
              <input type="file" accept="application/pdf,text/*,image/*" hidden onChange={handleFile} />
            </label>
            {editing.fileUrl && (
              <a href={editing.fileUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-700 inline-flex items-center gap-1 hover:underline">
                <FileText className="size-4" /> Xem tệp đã đính kèm
              </a>
            )}
          </div>

          {error && <div className="text-sm text-rose-600">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={cancel} className="btn-ghost text-sm">Huỷ</button>
            <button onClick={save} disabled={saving} className="btn-primary text-sm">
              <Save className="size-4" /> {saving ? "Đang lưu…" : "Lưu"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="card p-4 flex gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wide text-brand-700 font-semibold">{it.category || "Tổng quát"}</div>
              <div className="font-semibold text-slate-800 truncate">{it.title}</div>
              <div className="text-sm text-slate-600 mt-1">{truncate(it.content, 220)}</div>
              <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-slate-500">
                <span>Cập nhật: {formatDate(it.updatedAt)}</span>
                {(it.tags || []).slice(0, 6).map((t) => (
                  <span key={t} className="badge !bg-slate-100 !text-slate-600">#{t}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button className="btn-ghost text-sm" onClick={() => startEdit(it)}>
                <Pencil className="size-4" />
              </button>
              <button className="btn-ghost text-sm text-rose-600" onClick={() => remove(it.id)}>
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="card p-8 text-center text-slate-500 text-sm">
            Chưa có nội dung. Hãy bấm "Thêm mục mới" để bắt đầu nạp tri thức cho chatbot.
          </div>
        )}
      </div>
    </div>
  );
}
