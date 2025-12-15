//--------------------------------------------------------------
// FILE: src/core/parse.ts
// Continuum Adaptive Parser — CLI Entry
//--------------------------------------------------------------

import fs from "fs";
import path from "path";
import readline from "readline";
import { readFile } from "fs/promises";

import { loadExport } from "./pipeline.js";
import { runFullPipeline } from "./pipeline.js";
import { printBanner } from "../ui/renderer.js";
import { askDedupeMode } from "../ui/renderer.js";
import { color, CYAN, GREEN, YELLOW, MAGENTA } from "../ui/colors.js";

async function main() {
  const inputPath = process.argv[2] || "./input";
  const GOBLIN = process.argv.includes("--goblin") || process.env.GOBLIN_MODE === "1";

  printBanner(GOBLIN);

  const mode = await askDedupeMode(GOBLIN);

  console.log(color(`\n▶️  Starting Continuum Parser in ${mode.toUpperCase()} mode...\n`, GREEN));

  if (GOBLIN) console.log(color("[goblin-ash] 🧪 goblin mode engaged.\n", MAGENTA));

  try {
    console.log(color(`📂 Loading export from: ${inputPath}`, CYAN));
    const root = await loadExport(inputPath);
    console.log(color(`   Loaded ${Object.keys(root.mapping).length} nodes`, GREEN));

    const result = await runFullPipeline(root, { mode, goblin: GOBLIN });

    console.log(color("\n✔️ Pipeline complete!\n", GREEN));
    console.log(`📝 Persona blocks: ${result.personaBlocks.length}`);
    console.log(`👤 Human blocks: ${result.humanBlocks.length}`);
    console.log(`📚 Archival memories: ${result.archivalMemories.length}`);

    const outDir = path.join(process.cwd(), "output");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

    fs.writeFileSync(path.join(outDir, "persona_blocks.json"), JSON.stringify(result.personaBlocks, null, 2));
    fs.writeFileSync(path.join(outDir, "human_blocks.json"), JSON.stringify(result.humanBlocks, null, 2));
    fs.writeFileSync(path.join(outDir, "archival_memories.json"), JSON.stringify(result.archivalMemories, null, 2));
    fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(result.discovery, null, 2));

    console.log(color("\n✨ Output written to ./output/\n", CYAN));

  } catch (err) {
    console.error(color("\n❌ Parser failed:", YELLOW));
    if (GOBLIN) console.error(color("[goblin-ash] 💥 chaos detected.", MAGENTA));
    console.error(err);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].includes("parse")) {
  main();
}
