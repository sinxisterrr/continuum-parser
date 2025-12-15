//--------------------------------------------------------------
// FILE: src/core/postprocess.ts
// Final dedupe + cleanup helpers
//--------------------------------------------------------------
export function dedupeBlocks(blocks, mode) {
    const out = [];
    const seen = new Set();
    for (const b of blocks) {
        const key = mode === "fast"
            ? `${b.label}:${b.content.slice(0, 80)}`
            : `${b.label}:${b.content}`;
        if (!seen.has(key)) {
            seen.add(key);
            out.push(b);
        }
    }
    return out;
}
export function dedupeArchivalBlocks(blocks, mode) {
    const sorted = [...blocks].sort((a, b) => b.importance - a.importance);
    const out = [];
    const seen = new Set();
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
