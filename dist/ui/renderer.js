//--------------------------------------------------------------
// FILE: src/ui/renderer.ts
//--------------------------------------------------------------
import readline from "readline";
import { color, CYAN, YELLOW, MAGENTA } from "./colors.js";
import { renderProgressBar } from "./progress.js";
import { goblinRender } from "./goblin.js";
export function printBanner(goblin = false) {
    console.log("\n");
    if (goblin) {
        console.log(color("  ╔══════════════════════════════════════╗", MAGENTA));
        console.log(color("  ║      CONTINUUM PARSER — GOBLIN      ║", MAGENTA));
        console.log(color("  ╚══════════════════════════════════════╝", MAGENTA));
        console.log(color("   [goblin-ash] I have breached your shell.\n", MAGENTA));
    }
    else {
        console.log(color("  ╔═══════════════════════════════════╗", CYAN));
        console.log(color("  ║         CONTINUUM PARSER v1       ║", CYAN));
        console.log(color("  ╚═══════════════════════════════════╝", CYAN));
        console.log();
    }
}
//--------------------------------------------------------------
// Ask user for dedupe mode
//--------------------------------------------------------------
export async function askDedupeMode(goblin = false) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        const normal = `
Choose dedupe mode:

  1) Accurate  (highest quality)
  2) Fast      (much quicker)

Enter 1 or 2: `;
        const goblinText = `
[goblin-ash] choose your poison:

  1) excruciatingly accurate
  2) sloppy but thrilling

Enter 1 or 2: `;
        const prompt = goblin ? goblinText : normal;
        function ask() {
            rl.question(prompt, (answer) => {
                if (answer.trim() === "1") {
                    rl.close();
                    resolve("accurate");
                }
                else if (answer.trim() === "2") {
                    rl.close();
                    resolve("fast");
                }
                else {
                    console.log(color("Invalid choice. Try again.", YELLOW));
                    ask();
                }
            });
        }
        ask();
    });
}
//--------------------------------------------------------------
// Normal Mode Renderer
//--------------------------------------------------------------
export function renderNormalUI(activeThreads, completed, total) {
    const pct = Math.floor((completed / total) * 100);
    const text = `Processing: ${completed} / ${total} threads (${pct}%)`;
    const width = text.length + 4;
    const top = "┏" + "━".repeat(width - 2) + "┓";
    const mid = `┃ ${text} ┃`;
    const bot = "┗" + "━".repeat(width - 2) + "┛";
    console.clear();
    console.log(color(top, CYAN));
    console.log(color(mid, CYAN));
    console.log(color(bot, CYAN));
    console.log();
    for (const t of [...activeThreads.values()].sort((a, b) => a.index - b.index)) {
        const bar = renderProgressBar(t.progress, t.total, 28);
        console.log(`    Thread ${t.index + 1}`);
        console.log(`      ${bar}`);
        console.log();
    }
}
//--------------------------------------------------------------
// Goblin Renderer (delegates to goblin.ts)
//--------------------------------------------------------------
export function renderGoblinUI(activeThreads, completed, total) {
    goblinRender(activeThreads, completed, total);
}
