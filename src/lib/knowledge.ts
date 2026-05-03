import "server-only";
import { adminDb } from "./firebaseAdmin";
import type { KnowledgeEntry, Faq } from "./types";

const MAX_KB_CHARS = 18_000;

/**
 * Pull the most recently updated knowledge entries plus the top FAQs and
 * concatenate them into a single context block that fits inside the model's
 * prompt budget. Naïve relevance: we score by keyword overlap with the user's
 * question to surface likely matches first.
 */
export async function buildKnowledgeContext(question: string) {
  const db = adminDb();
  const [kbSnap, faqSnap] = await Promise.all([
    db.collection("knowledge").orderBy("updatedAt", "desc").limit(80).get(),
    db.collection("faqs").where("published", "==", true).limit(60).get(),
  ]);

  const kb: KnowledgeEntry[] = kbSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<KnowledgeEntry, "id">) }));
  const faqs: Faq[] = faqSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Faq, "id">) }));

  const tokens = tokenize(question);
  const scored = [
    ...kb.map((k) => ({
      kind: "kb" as const,
      score: scoreText(tokens, `${k.title} ${k.tags?.join(" ") ?? ""} ${k.content}`),
      entry: k,
    })),
    ...faqs.map((f) => ({
      kind: "faq" as const,
      score: scoreText(tokens, `${f.question} ${f.answer}`),
      entry: f,
    })),
  ]
    .filter((x) => x.score > 0 || tokens.length === 0)
    .sort((a, b) => b.score - a.score);

  // Always include some context even if zero keyword overlap (cold start).
  const fallback = scored.length === 0 ? [
    ...kb.slice(0, 6).map((k) => ({ kind: "kb" as const, score: 0, entry: k })),
    ...faqs.slice(0, 6).map((f) => ({ kind: "faq" as const, score: 0, entry: f })),
  ] : [];

  const ordered = (scored.length ? scored : fallback).slice(0, 25);

  let total = 0;
  const blocks: string[] = [];
  const sources: string[] = [];
  for (const item of ordered) {
    const block = item.kind === "kb"
      ? `### [KB] ${item.entry.title}${item.entry.category ? ` (${item.entry.category})` : ""}\n${item.entry.content}`
      : `### [FAQ] ${item.entry.question}\n${item.entry.answer}`;
    if (total + block.length > MAX_KB_CHARS) break;
    blocks.push(block);
    total += block.length;
    sources.push(item.kind === "kb" ? `KB:${item.entry.title}` : `FAQ:${item.entry.question}`);
  }

  return { context: blocks.join("\n\n"), sources };
}

function tokenize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9À-ỹ]+/i)
    .filter((t) => t.length > 2);
}

function scoreText(tokens: string[], text: string) {
  if (!tokens.length) return 0;
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  let s = 0;
  for (const tok of tokens) if (t.includes(tok)) s += 1;
  return s;
}
