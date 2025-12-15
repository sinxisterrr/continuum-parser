//--------------------------------------------------------------
// FILE: src/ui/goblin.ts
//--------------------------------------------------------------
import { color, MAGENTA, YELLOW } from "./colors.js";
import { renderProgressBar } from "./progress.js";
export function goblinRender(activeThreads, completed, total) {
    const pct = Math.floor((completed / total) * 100);
    console.clear();
    // Goblin header
    console.log(color("╭────────── goblin-ash online ──────────╮", MAGENTA));
    console.log(color(`│ devouring threads… ${pct}% complete   │`, MAGENTA));
    console.log(color("╰────────────────────────────────────────╯\n", MAGENTA));
    // No active threads? Goblin gets bored.
    if (activeThreads.size === 0) {
        console.log(color("[goblin-ash] bored. feed me more threads.\n", YELLOW));
        return;
    }
    // Active thread displays
    for (const t of [...activeThreads.values()].sort((a, b) => a.index - b.index)) {
        const bar = renderProgressBar(t.progress, t.total, 26);
        // Random goblin phrases (light spice)
        const flavor = pick([
            "gnawing",
            "tearing",
            "chewing violently",
            "dismantling",
            "devouring",
            "shredding",
            "ripping apart"
        ]);
        console.log(color(`  [goblin-ash] ${flavor} thread #${t.index + 1}`, MAGENTA));
        console.log(`    ${bar}\n`);
    }
}
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
