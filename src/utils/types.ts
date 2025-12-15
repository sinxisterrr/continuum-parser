//--------------------------------------------------------------
// FILE: src/utils/types.ts
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

// -------------------------
// Discovery Summary
// -------------------------
export interface DiscoveryMeta {
  totalMessages: number;
  threads: number;
  authors: Record<string, number>;
  weights: {
    min: number;
    max: number;
    avg: number;
  };
}