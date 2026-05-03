"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/components/AuthProvider";
import { formatDate } from "@/lib/utils";
import { MessageSquare, RefreshCcw, Bot, User as UserIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Conv {
  id: string;
  lastMessageAt?: number;
  createdAt?: number;
  messageCount?: number;
}

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export default function ConversationsPage() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState<Conv[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await apiFetch<{ items: Conv[] }>("/api/admin/conversations");
      setItems(data.items);
      if (!selected && data.items.length) setSelected(data.items[0]!.id);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(id: string) {
    const data = await apiFetch<{ messages: Msg[] }>(`/api/admin/conversations?id=${id}`);
    setMessages(data.messages);
  }

  useEffect(() => { load(); }, [isAdmin]);
  useEffect(() => { if (selected) loadMessages(selected); }, [selected]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hội thoại gần đây</h1>
          <p className="text-sm text-slate-600">Xem lại câu hỏi của thí sinh/phụ huynh để cải thiện kho tri thức.</p>
        </div>
        <button onClick={load} className="btn-outline text-sm" disabled={loading}>
          <RefreshCcw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Làm mới
        </button>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <div className="card p-2 max-h-[70vh] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-sm text-slate-500 p-4 text-center">Chưa có hội thoại nào.</div>
          ) : (
            <ul className="space-y-1">
              {items.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setSelected(c.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                      selected === c.id ? "bg-brand-50 text-brand-700" : "hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="size-4" />
                      <span className="truncate font-medium">{c.id.slice(0, 8)}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {formatDate(c.lastMessageAt)} · {c.messageCount || 0} tin nhắn
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-4 max-h-[70vh] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-sm text-slate-500 text-center py-10">Chọn một hội thoại để xem chi tiết.</div>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`size-8 rounded-full grid place-items-center shrink-0 ${m.role === "user" ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700"}`}>
                    {m.role === "user" ? <UserIcon className="size-4" /> : <Bot className="size-4" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm prose-chat ${
                    m.role === "user" ? "bg-brand-600 text-white" : "bg-white border border-slate-200"
                  }`}>
                    {m.role === "user" ? (
                      <div>{m.content}</div>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                    )}
                    <div className={`text-[10px] mt-1 ${m.role === "user" ? "text-brand-100" : "text-slate-400"}`}>
                      {formatDate(m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
