//--------------------------------------------------------------
// FILE: src/core/pipeline.ts
// Continuum Adaptive Parser – Full Memory Pipeline
// FIXED: Actually write human_blocks.json!
//--------------------------------------------------------------

import fs from "fs";
import path from "path";
import { readFile } from "fs/promises";
import mammoth from "mammoth";

import {
  ExportRoot,
  MappingNode,
  PersonaBlock,
  ArchivalMemoryItem,
  DiscoveryMeta,
} from "../types/memory.js";

import { ConversationThread } from "../types/threads.js";

import { runDiscovery } from "../discovery/discoveryPass.js";
import { runExtraction } from "../extraction/extractionPass.js";
import { processThreadsConcurrently } from "./threads.js";
import { dedupeBlocks, dedupeArchivalBlocks } from "./postprocess.js";

//--------------------------------------------------------------
// FILE TEXT EXTRACTION HELPERS
//--------------------------------------------------------------

async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  if (ext === ".txt") {
    return await readFile(filePath, "utf8");
  } else if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } else if (ext === ".doc") {
    // .doc (old binary format) - try to read as text first, may not work perfectly
    // For better .doc support, consider using textract or similar
    try {
      return await readFile(filePath, "utf8");
    } catch {
      throw new Error(`.doc file format not fully supported. Please convert ${filePath} to .docx or .txt`);
    }
  } else {
    // Try to read as text for other files
    return await readFile(filePath, "utf8");
  }
}

async function loadFileAsExport(filePath: string): Promise<ExportRoot | null> {
  try {
    const text = await extractTextFromFile(filePath);
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(text);
      
      // Export array (multiple conversations.json dumps)
      if (Array.isArray(parsed)) {
        const merged: Record<string, MappingNode> = {};
        for (const convo of parsed) {
          if (convo && convo.mapping) Object.assign(merged, convo.mapping);
        }
        return { mapping: merged };
      }
      
      // Normal export with mapping
      if (parsed.mapping) {
        return parsed as ExportRoot;
      }
      
      // If it's a valid JSON object but no mapping, return null
      return null;
    } catch {
      // Not valid JSON, return null
      return null;
    }
  } catch (err) {
    // File read error
    console.warn(`Warning: Could not read file ${filePath}: ${err}`);
    return null;
  }
}

//--------------------------------------------------------------
// LOAD EXPORT (JSON OR FOLDER)
//--------------------------------------------------------------

export async function loadExport(filePath: string): Promise<ExportRoot> {
  const stats = fs.statSync(filePath);

  // Folder of documents → combine into one mapping
  if (stats.isDirectory()) {
    const merged: Record<string, MappingNode> = {};
    const files = fs.readdirSync(filePath);

    // Process conversations.json first if it exists
    const conversationsJsonPath = path.join(filePath, "conversations.json");
    if (fs.existsSync(conversationsJsonPath)) {
      const root = await loadFileAsExport(conversationsJsonPath);
      if (root && root.mapping) {
        Object.assign(merged, root.mapping);
      }
    }

    // Process other files (.txt, .doc, .docx, and other JSON files)
    for (const f of files) {
      // Skip conversations.json as we already processed it
      if (f === "conversations.json") continue;
      
      const p = path.join(filePath, f);
      const ext = path.extname(f).toLowerCase();
      
      // Process .txt, .doc, .docx, and .json files
      if (ext === ".txt" || ext === ".doc" || ext === ".docx" || ext === ".json") {
        const root = await loadFileAsExport(p);
        if (root && root.mapping) {
          Object.assign(merged, root.mapping);
        }
      }
    }

    return { mapping: merged };
  }

  // Single file - try to load it
  const root = await loadFileAsExport(filePath);
  if (root) {
    return root;
  }

  throw new Error(`Unrecognized export format in ${filePath}`);
}

//--------------------------------------------------------------
// THREAD EXTRACTION
//--------------------------------------------------------------

export function extractThreads(root: ExportRoot): ConversationThread[] {
  const mapping = root.mapping;
  const visited = new Set<string>();
  const threads: ConversationThread[] = [];

  const roots = Object.values(mapping).filter(
    node => !node.parent || !mapping[node.parent]
  );

  function walk(id: string, out: MappingNode[] = []): MappingNode[] {
    if (visited.has(id)) return out;
    visited.add(id);

    const n = mapping[id];
    if (!n) return out;

    out.push(n);
    for (const c of n.children || []) walk(c, out);
    return out;
  }

  for (const r of roots) {
    const msgs = walk(r.id);
    const total = msgs.reduce((s, x) => s + (x.message?.weight || 1), 0);
    const avg = msgs.length ? total / msgs.length : 1;

    threads.push({
      id: r.id,
      messages: msgs,
      weight: avg,
    });
  }

  return threads;
}

//--------------------------------------------------------------
// FULL PIPELINE
//--------------------------------------------------------------

export async function runFullPipeline(
  root: ExportRoot,
  options: { mode: "accurate" | "fast"; goblin: boolean }
) {
  // ---------------------------
  // 1) Discovery pass
  // ---------------------------

  const discovery: DiscoveryMeta = runDiscovery(root);

  // ---------------------------
  // 2) Thread extraction
  // ---------------------------

  const threads = extractThreads(root);

  const personaBlocks: any[] = [];
  const humanBlocks: any[] = [];
  const archivalMemories: any[] = [];

  // ---------------------------
  // 3) Run per-thread extraction
  // ---------------------------

  await processThreadsConcurrently(
    threads,
    options,
    personaBlocks,
    humanBlocks,
    archivalMemories
  );

  // ---------------------------
  // 4) Merge + Dedupe
  // ---------------------------

  const dedupedPersona = dedupeBlocks(personaBlocks, options.mode);
  const dedupedHuman = dedupeBlocks(humanBlocks, options.mode);
  const dedupedArchival = dedupeArchivalBlocks(archivalMemories, options.mode);

  return {
    discovery,
    personaBlocks: dedupedPersona,
    humanBlocks: dedupedHuman,
    archivalMemories: dedupedArchival,
  };
}