//--------------------------------------------------------------
// FILE: src/core/postprocess.ts
// Final dedupe + cleanup helpers
//--------------------------------------------------------------

export function dedupeBlocks(blocks: any[], mode: "accurate" | "fast") {
  const out: any[] = [];
  const seen = new Set<string>();

  for (const b of blocks) {
    const key =
      mode === "fast"
        ? `${b.label}:${b.content.slice(0, 80)}`
        : `${b.label}:${b.content}`;

    if (!seen.has(key)) {
      seen.add(key);
      out.push(b);
    }
  }

  return out;
}

export function dedupeArchivalBlocks(blocks: any[], mode: "accurate" | "fast") {
  const sorted = [...blocks].sort((a, b) => b.importance - a.importance);
  const out: any[] = [];
  const seen = new Set<string>();

  for (const m of sorted) {
    const key = mode === "fast"
      ? m.content.slice(0, 100)
      : m.content;

    if (!seen.has(key)) {
      seen.add(key);
      out.push(m);
    }
  }

  return out;
}
