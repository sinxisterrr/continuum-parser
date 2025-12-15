//--------------------------------------------------------------
// FILE: src/types/threads.ts
//--------------------------------------------------------------

import { MappingNode } from "./memory.js";

export interface ConversationThread {
  id: string;
  messages: MappingNode[];
  weight: number;
}

export interface ActiveThread {
  id: string;
  index: number;
  progress: number;
  total: number;
}
