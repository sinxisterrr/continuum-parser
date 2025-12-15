//--------------------------------------------------------------
// FILE: src/core/threads.ts
// FIXED: Properly collect humanBlocks
//--------------------------------------------------------------

import { ExportRoot, MappingNode } from "../types/memory.js";
import { ActiveThread, ConversationThread } from "../types/threads.js";

import { runExtraction } from "../extraction/extractionPass.js";

import { renderNormalUI, renderGoblinUI } from "../ui/renderer.js";

export async function processThreadsConcurrently(
  threads: ConversationThread[],
  options: { mode: "accurate" | "fast"; goblin: boolean },
  personaBlocks: any[],
  humanBlocks: any[],
  archivalMemories: any[]
): Promise<void> {

  const CONCURRENCY = 5;
  let completed = 0;

  const activeThreads: Map<number, ActiveThread> = new Map();
  const activePromises = new Set<Promise<void>>();

  // UI updater
  function updateUI() {
    if (options.goblin) {
      renderGoblinUI(activeThreads, completed, threads.length);
    } else {
      renderNormalUI(activeThreads, completed, threads.length);
    }
  }

  // Individual thread executor
  async function handleThread(thread: ConversationThread, index: number) {
    const mapping = Object.fromEntries(thread.messages.map(m => [m.id, m]));
    const threadRoot: ExportRoot = { mapping };

    const totalMsgs = thread.messages.length;

    // Register thread as active
    activeThreads.set(index, {
        id: thread.id,
        index,
        progress: 0,
        total: totalMsgs
    });
    updateUI();

    // ---------------------------------------------------
    // Simulated progress – gives us moving progress bars
    // ---------------------------------------------------
    for (let i = 0; i < totalMsgs; i++) {
      const t = activeThreads.get(index);
      if (t) {
        t.progress = i;
        activeThreads.set(index, t);
        updateUI();
      }
      await new Promise((res) => setTimeout(res, 5));
    }

    // Run extraction
    const extraction = runExtraction(threadRoot, { goblin: options.goblin });

    // Finish progress visually
    const t = activeThreads.get(index);
    if (t) {
      t.progress = totalMsgs;
      activeThreads.set(index, t);
    }
    updateUI();

    // Collect extracted memories
    for (const p of extraction.personaBlocks) personaBlocks.push(p);
    for (const h of extraction.humanBlocks) humanBlocks.push(h);
    for (const a of extraction.archival) archivalMemories.push(a);

    // ----------------------------------------
    // Now remove thread from the active set
    // AFTER progress is fully shown
    // ----------------------------------------
    activeThreads.delete(index);
    completed++;
    updateUI();
  }

  // Start processing with concurrency
  let cursor = 0;
  updateUI();

  while (cursor < threads.length || activePromises.size > 0) {

    while (cursor < threads.length && activePromises.size < CONCURRENCY) {
      const promise = handleThread(threads[cursor], cursor);
      activePromises.add(promise);
      promise.finally(() => activePromises.delete(promise));
      cursor++;
      await new Promise(res => setTimeout(res, 10));
    }

    if (activePromises.size > 0) {
      await Promise.race([...activePromises]);
    }
  }
}