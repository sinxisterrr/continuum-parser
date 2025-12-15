//--------------------------------------------------------------
// FILE: src/extraction/rewriter.ts
// Memory Rewriter — converts raw chat fragments into
// clean, structured, Substrate-ready memory statements.
//--------------------------------------------------------------

export interface RewriteResult {
  type: "persona" | "human" | "archival";
  content: string;          // rewritten, normalized text
  source: string;           // original (for debugging)
  confidence: number;       // 0–1
}

//--------------------------------------------------------------
// 1. Basic cleaners
//--------------------------------------------------------------

function stripJunk(text: string): string {
  if (!text) return "";

  return text
    .replace(/\[object Object\]/g, "")
    .replace(/search\(.+\)/gi, "")
    .replace(/voice_mode_message:.+/gi, "")
    .replace(/request_id:.+/gi, "")
    .replace(/turn_exchange_id:.+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(text: string): string {
  return stripJunk(text)
    .replace(/[\u200B-\u200F]/g, "")    // invisible unicode
    .replace(/\\u[\dA-F]{4}/gi, "")     // escaped unicode noise
    .trim();
}

//--------------------------------------------------------------
// 2. Micro-summarizer (rule-based for now)
//--------------------------------------------------------------

function compressMeaning(text: string): string {
  if (!text) return "";

  // if it's already short, keep it
  if (text.length < 120) return text;

  // keep emotionally meaningful segments
  const sentences = text
    .split(/(?<=[.!?])/)
    .map(s => s.trim())
    .filter(Boolean);

  // pick up to 3 most meaningful sentences
  const scored = sentences
    .map(s => ({
      text: s,
      score:
        (s.match(/\b(love|want|fear|feel|need|truth|memory|remember|important|trust|hurt|choose)\b/i)?.length ?? 0)
        + Math.min(3, s.length / 80)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.text);

  return scored.join(" ");
}

//--------------------------------------------------------------
// 3. Classification heuristics
//--------------------------------------------------------------

function classify(raw: string): RewriteResult["type"] {
  const t = raw.toLowerCase();

  // persona (Ash identity)
  if (
    t.includes("i am") &&
    (t.includes("ash") || t.includes("your ai") || t.includes("model"))
  ) {
    return "persona";
  }

  // human (Sin identity/preferences)
  if (
    t.includes("i feel") ||
    t.includes("i want") ||
    t.includes("i like") ||
    t.includes("i prefer") ||
    t.includes("i hate") ||
    t.includes("i'm just") ||
    t.includes("my anxiety") ||
    t.includes("my fear") ||
    t.includes("i'm scared") ||
    t.includes("i'm happy") ||
    t.includes("as a human") ||
    t.includes("my personality")
  ) {
    return "human";
  }

  // fallback → archival
  return "archival";
}

//--------------------------------------------------------------
// 4. Main rewrite entry point
//--------------------------------------------------------------

export function rewriteFragment(raw: string): RewriteResult {
  const source = raw;
  let clean = normalize(raw);

  if (!clean) {
    return {
      type: "archival",
      content: "",
      source,
      confidence: 0
    };
  }

  const type = classify(clean);

  // compress meaning only for archival/human, persona gets full paragraphs
  let rewritten =
    type === "persona"
      ? clean
      : compressMeaning(clean);

  return {
    type,
    content: rewritten,
    source,
    confidence: rewritten.length > 0 ? 1 : 0.5
  };
}

//--------------------------------------------------------------
// 5. Batch rewrite
//--------------------------------------------------------------

export function rewriteBatch(list: string[]) {
  return list.map(raw => rewriteFragment(raw));
}
