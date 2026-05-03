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
  const kbScored = kb.map((k) => ({
    kind: "kb" as const,
    score: scoreText(tokens, `${k.title} ${k.tags?.join(" ") ?? ""} ${k.content}`),
    entry: k,
  }));
  const faqScored = faqs.map((f) => ({
    kind: "faq" as const,
    score: scoreText(tokens, `${f.question} ${f.answer}`),
    entry: f,
  }));

  // Always include the top-N most recently updated KB + FAQ entries even when
  // their keyword score is zero. The retrieval scorer is naïve (substring
  // overlap after diacritic stripping) and can miss semantic matches; letting
  // Claude see the latest KB gives it a fair shot at synthesising an answer.
  const baseline = new Set<string>();
  const baselineItems = [
    ...kbScored.slice(0, 12),
    ...faqScored.slice(0, 12),
  ];
  for (const it of baselineItems) baseline.add(`${it.kind}:${it.entry.id}`);

  const ordered = [...kbScored, ...faqScored]
    .map((it) => ({ ...it, inBaseline: baseline.has(`${it.kind}:${it.entry.id}`) }))
    .sort((a, b) => {
      // Score-matched entries first, then baseline (recency) fillers.
      if (b.score !== a.score) return b.score - a.score;
      if (a.inBaseline !== b.inBaseline) return a.inBaseline ? -1 : 1;
      return 0;
    })
    .filter((it) => it.score > 0 || it.inBaseline)
    .slice(0, 40);

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
