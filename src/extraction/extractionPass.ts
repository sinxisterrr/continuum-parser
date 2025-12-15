//--------------------------------------------------------------
// FILE: src/extraction/extractionPass.ts
// FIXED: Proper text extraction, filtering, and classification
//--------------------------------------------------------------

import {
  ExportRoot,
  MappingNode,
  PersonaBlock,
  ArchivalMemoryItem
} from "../types/memory.js";

import { classifyParagraphToMIRA, MIRAChannel } from "../utils/documentClassifier.js";
import { dedupeArchival } from "./dedupePass.js";

type Message = MappingNode["message"];

// ------------------ Helpers ------------------

function getText(msg: Message): string {
  if (!msg || !msg.content) return "";

  const c: any = msg.content;

  // Handle parts array
  if (Array.isArray(c.parts)) {
    return c.parts
      .filter((part: any) => {
        // Only keep actual strings, skip objects
        if (typeof part === 'string') return true;
        if (part === null || part === undefined) return false;
        
        // If it's an object, try to extract text property
        if (typeof part === 'object' && part.text) {
          return typeof part.text === 'string';
        }
        
        return false;
      })
      .map((part: any) => {
        // Extract text from objects that have a text property
        if (typeof part === 'string') return part;
        if (typeof part === 'object' && part.text) return part.text;
        return '';
      })
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  // Handle direct text field
  if (typeof c.text === "string") {
    return c.text.trim();
  }

  // If content itself is a string
  if (typeof c === "string") {
    return c.trim();
  }

  return "";
}

function clamp(n: number) {
  return Math.max(1, Math.min(10, Math.round(n)));
}

function scoreImportance(msg: Message, textLength: number, text: string): number {
  let score = 5;

  const role = msg.author?.role || "unknown";
  const metadata = msg.metadata as any;

  // Detect automated/generated content
  const isGenerated = 
    metadata?.dalle_prompt ||
    metadata?.image_gen_async ||
    metadata?.dalle_metadata ||
    text.includes("dalle.create") ||
    text.includes("Generated image") ||
    text.includes("browser.click") ||
    text.includes("browser.search");

  if (isGenerated) {
    score = 3; // Start much lower for generated content
  }

  // Weight from message metadata (but cap it)
  if (typeof msg.weight === "number" && !isGenerated) {
    score += Math.min(2, (msg.weight - 1)); // Cap the boost
  }

  // Role-based adjustments
  if (role === "user") score += 1;
  if (role === "system") score -= 2;
  if (role === "tool") score -= 3;

  // Length-based adjustments (longer = potentially more important)
  if (textLength > 500 && !isGenerated) score += 1;
  if (textLength > 1000 && !isGenerated) score += 1;
  if (textLength < 50) score -= 2;

  // Content quality signals
  const hasEmotionalContent = /\b(feel|feeling|love|hate|scared|happy|sad|angry|excited)\b/i.test(text);
  const hasDecisionMaking = /\b(decide|decided|choice|choose|important|matter)\b/i.test(text);
  const hasPersonalInfo = /\b(my|i'm|i am|me|myself)\b/i.test(text);

  if (hasEmotionalContent) score += 1;
  if (hasDecisionMaking) score += 1;
  if (hasPersonalInfo) score += 0.5;

  return clamp(score);
}

function miraToCategory(m: MIRAChannel): string {
  switch (m) {
    case "memory": return "episodic";
    case "identity": return "identity";
    case "relationship": return "relationship";
    case "agent": return "behavioral";
    default: return "general";
  }
}

function isJunkMessage(text: string, role: string, metadata?: any): boolean {
  if (!text || text.length === 0) return true;
  
  // Filter tool calls and image generation
  if (metadata?.dalle_prompt || metadata?.dalle_metadata) return true;
  if (metadata?.image_gen_async || metadata?.browser) return true;
  
  // Filter out common junk patterns
  const junkPatterns = [
    /^\[object Object\]/,
    /^Model set context updated\.?$/i,
    /^All the files uploaded by the user have been fully loaded/i,
    /^search\(.+\)$/i,
    /^voice_mode_message:/i,
    /^request_id:/i,
    /^turn_exchange_id:/i,
    /^Searched \d+ sites?$/i,
    /^Clicked on/i,
    /dalle\.create/i,
    /browser\.(click|search|scroll)/i,
    /^Generated image/i,
  ];

  for (const pattern of junkPatterns) {
    if (pattern.test(text)) return true;
  }

  // Filter emoji-only messages (but keep if there's actual text too)
  const emojiOnly = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+$/u;
  if (emojiOnly.test(text)) return true;

  // Filter very short tool/system messages
  if ((role === "tool" || role === "system") && text.length < 20) return true;

  return false;
}

// ------------------ Main Extraction ------------------

export function runExtraction(root: ExportRoot, options: { goblin?: boolean } = {}) {
  const mapping = root.mapping;
  const ids = Object.keys(mapping);

  const archival: ArchivalMemoryItem[] = [];
  
  // Separate buckets for persona (assistant) vs human (user)
  const personaBuckets: Record<MIRAChannel, string[]> = {
    memory: [],
    identity: [],
    relationship: [],
    agent: [],
    unknown: []
  };
  
  const humanBuckets: Record<MIRAChannel, string[]> = {
    memory: [],
    identity: [],
    relationship: [],
    agent: [],
    unknown: []
  };

  let filtered = 0;
  let processed = 0;
  let userMessages = 0;
  let assistantMessages = 0;

  for (const id of ids) {
    const node = mapping[id];
    if (!node || !node.message) continue;

    const msg = node.message;
    
    // Skip messages without author
    if (!msg.author) continue;
    
    const text = getText(msg);
    const role = msg.author.role || "unknown";

    // Filter junk
    if (isJunkMessage(text, role, msg.metadata)) {
      filtered++;
      continue;
    }

    processed++;

    // Classify via MIRA
    let mira: MIRAChannel = node.message.metadata?.miraType || "unknown";
    if (mira === "unknown") {
      const result = classifyParagraphToMIRA(text, "conversations.json");
      mira = result.miraType;
    }

    // Route to correct bucket based on role
    if (role === "assistant") {
      personaBuckets[mira].push(text);
      assistantMessages++;
    } else if (role === "user") {
      humanBuckets[mira].push(text);
      userMessages++;
    }
    // system/tool messages don't go to persona/human blocks

    // Calculate importance
    const importance = scoreImportance(msg, text.length, text);

    // Create archival memory
    archival.push({
      id: msg.id,
      content: text,
      category: miraToCategory(mira),
      importance,
      timestamp: msg.create_time ?? null,
      tags: [role, `mira:${mira}`],
      metadata: {
        miraType: mira,
        length: text.length,
        // Keep only useful metadata
        ...(msg.metadata?.model_slug && { model: msg.metadata.model_slug }),
        ...(msg.metadata?.gizmo_id && { gizmo_id: msg.metadata.gizmo_id }),
      }
    });
  }

  // Suppress verbose extraction stats in normal runs to keep UI clean.

  // Build persona blocks (assistant messages)
  const personaBlocks: PersonaBlock[] = [];

  function addPersonaBlock(label: string, key: MIRAChannel, description: string) {
    const list = personaBuckets[key];
    if (!list.length) return;

    personaBlocks.push({
      label: `persona_${label}`,
      block_type: "persona",
      content: list.join("\n\n"),
      description,
      metadata: { miraType: key, count: list.length },
      limit: 8192,
      read_only: false
    });
  }

  addPersonaBlock(
    "identity",
    "identity",
    "AI assistant's core identity, values, and self-concept from conversations"
  );
  
  addPersonaBlock(
    "relationship",
    "relationship",
    "AI assistant's understanding of relationship dynamics and shared experiences"
  );
  
  addPersonaBlock(
    "agent",
    "agent",
    "AI assistant's behavioral patterns, preferences, and interaction style"
  );

  addPersonaBlock(
    "memory",
    "memory",
    "AI assistant's memories of shared experiences and events"
  );

  // Also include unknown if there's significant content
  if (personaBuckets.unknown.length > 0) {
    addPersonaBlock(
      "general",
      "unknown",
      "AI assistant's general statements and miscellaneous information"
    );
  }

  // Build human blocks (user messages)
  const humanBlocks: PersonaBlock[] = [];

  function addHumanBlock(label: string, key: MIRAChannel, description: string) {
    const list = humanBuckets[key];
    if (!list.length) return;

    const block = {
      label: `human_${label}`,
      block_type: "human" as const,
      content: list.join("\n\n"),
      description,
      metadata: { miraType: key, count: list.length },
      limit: 8192,
      read_only: false
    };
    
    humanBlocks.push(block);
  }

  addHumanBlock(
    "identity",
    "identity",
    "Human user's identity, values, and self-descriptions from conversations"
  );
  
  addHumanBlock(
    "relationship",
    "relationship",
    "Human user's perspective on relationship dynamics and shared experiences"
  );
  
  addHumanBlock(
    "agent",
    "agent",
    "Human user's preferences, habits, and behavioral patterns"
  );

  addHumanBlock(
    "memory",
    "memory",
    "Human user's personal memories and experiences shared in conversations"
  );

  // Also include unknown if there's significant content
  if (humanBuckets.unknown.length > 0) {
    addHumanBlock(
      "general",
      "unknown",
      "Human user's general statements and miscellaneous information"
    );
  }

  // Dedupe archival
  const dedupedArchival = dedupeArchival(archival, options);

  return {
    personaBlocks,
    humanBlocks,
    archival: dedupedArchival
  };
}