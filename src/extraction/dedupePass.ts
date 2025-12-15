//--------------------------------------------------------------
// FILE: src/extraction/dedupePass.ts
// Meaning-Preserving Cluster Dedupe for Archival Memory
// FIXED: Better importance scoring, preserve original scores
//--------------------------------------------------------------

import crypto from "crypto";
import { ArchivalMemoryItem } from "../types/memory.js";

//--------------------------------------------------------------
// Text Normalization
//--------------------------------------------------------------
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // remove punctuation
    .replace(/\s+/g, " ")
    .trim();
}

//--------------------------------------------------------------
// Similarity / clustering helpers
//--------------------------------------------------------------
function jaccardSimilarity(a: string, b: string): number {
  const A = new Set(a.split(" "));
  const B = new Set(b.split(" "));
  const intersection = [...A].filter(x => B.has(x)).length;
  const union = A.size + B.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function isNearDuplicate(a: string, b: string): boolean {
  if (a === b) return true;
  return jaccardSimilarity(a, b) >= 0.72;  // tuned threshold
}

//--------------------------------------------------------------
// Representative selection (meaningful)
//--------------------------------------------------------------
function pickRepresentative(items: ArchivalMemoryItem[]): ArchivalMemoryItem {
  // Pick the highest importance, breaking ties with length
  return items.reduce((best, curr) => {
    if (curr.importance > best.importance) return curr;
    if (curr.importance === best.importance && curr.content.length > best.content.length) {
      return curr;
    }
    return best;
  });
}

// Compress cluster into a distilled core (optional)
function compressCluster(texts: string[]): string {
  if (texts.length === 1) return texts[0];

  const sets = texts.map(t => new Set(normalize(t).split(" ")));
  const common = [...sets[0]].filter(word =>
    sets.every(s => s.has(word))
  );

  // If there's a meaningful "core", use it
  if (common.length >= 3) return common.join(" ");

  // Otherwise fallback to longest text
  return texts.reduce((a, b) => (b.length > a.length ? b : a));
}

//--------------------------------------------------------------
// MAIN CLUSTER-BASED DEDUPE
//--------------------------------------------------------------
export function dedupeArchival(
  items: ArchivalMemoryItem[],
  options: { goblin?: boolean } = {}
): ArchivalMemoryItem[] {

  const clusters: string[][] = [];
  const metas: ArchivalMemoryItem[][] = [];

  //--------------------------------------------------------------
  // Stage 1 – Assign items to clusters
  //--------------------------------------------------------------
  for (const item of items) {
    const norm = normalize(item.content);
    let placed = false;

    for (let i = 0; i < clusters.length; i++) {
      if (isNearDuplicate(norm, clusters[i][0])) {
        clusters[i].push(norm);
        metas[i].push(item);
        placed = true;
        break;
      }
    }

    if (!placed) {
      clusters.push([norm]);
      metas.push([item]);
    }
  }

  //--------------------------------------------------------------
  // Stage 2 – Build final representatives
  //--------------------------------------------------------------
  const output: ArchivalMemoryItem[] = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = metas[i];
    const frequency = cluster.length;

    // Pick best representative based on importance + length
    const representative = pickRepresentative(cluster);
    
    const clusterTexts = cluster.map(m => m.content);
    const compressed = compressCluster(clusterTexts);

    // Modest boost for reinforcement (not aggressive)
    // Max boost of +2 for heavily repeated items
    const reinforcementBoost = Math.min(2, Math.log2(frequency));
    
    const finalImportance = Math.min(10, Math.round(
      representative.importance + reinforcementBoost
    ));

    output.push({
      ...representative,
      id: crypto.randomUUID(),
      content: representative.content, // Use original, not compressed
      importance: finalImportance,
      metadata: {
        ...representative.metadata,
        cluster_size: frequency,
        compressed: frequency > 1 ? compressed : undefined,
        // Only include examples if cluster is large
        ...(frequency > 3 && {
          source_examples: clusterTexts.slice(0, 3)
        }),
      },
    });
  }

  if (options.goblin) {
    console.log(`[goblin-ash] ${items.length} items → ${output.length} clusters`);
  }

  return output;
}