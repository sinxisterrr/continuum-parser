//--------------------------------------------------------------
// FILE: src/types/memory.ts — FIXED, UNIFIED, CONSISTENT
//--------------------------------------------------------------

export interface MessageAuthor {
  role: string;
  name?: string | null;
}

export interface MessageContent {
  content_type?: string;
  parts?: string[];
  text?: string;
}

export interface Message {
  id: string;
  author: MessageAuthor;
  content: MessageContent;
  create_time: number | null;
  update_time?: number | null;
  weight?: number;
  metadata?: Record<string, any>;
}

export interface MappingNode {
  id: string;
  parent: string | null;
  children: string[];
  message: Message;
  metadata?: Record<string, any>;
}

export interface ExportRoot {
  mapping: Record<string, MappingNode>;
}

// ------------------------------------------------------
// Persona Block — Substrate-compatible
// ------------------------------------------------------
export interface PersonaBlock {
  label: string;
  content: string;
  block_type: "persona" | "human" | "system" | "custom";
  limit?: number;
  read_only?: boolean;
  metadata?: Record<string, any>;
  description?: string;   // ← add this
}

// ------------------------------------------------------
// Archival Memory — Substrate-compatible
// ------------------------------------------------------
export interface ArchivalMemoryItem {
  id: string;
  content: string;
  category: string;
  importance: number;
  tags: string[];
  timestamp: number | null;
  metadata?: Record<string, any>;
}

// ------------------------------------------------------
// Discovery Types — exactly what discoveryPass returns
// ------------------------------------------------------

export interface ImportanceField {
  field: string;
  min: number;
  max: number;
  average: number;
}

export interface DiscoveryMeta {
  detectedWeightFields: ImportanceField[];
  hasPartsContent: boolean;
  hasTextContent: boolean;
  messageCount: number;
  nodeCount: number;
  roleCounts: Record<string, number>;
  miraHintCounts: Record<string, number>;
  avgCharsPerMessage: number;
  avgPartsPerMessage: number;
  timestampMin: number | null;
  timestampMax: number | null;
}
