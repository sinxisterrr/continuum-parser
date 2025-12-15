//--------------------------------------------------------------
// FILE: src/ui/progress.ts
//--------------------------------------------------------------
export function renderProgressBar(progress, total, width = 30) {
    const pct = total === 0 ? 0 : progress / total;
    const filled = Math.round(pct * width);
    const empty = width - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const percentText = `${Math.floor(pct * 100)}%`.padStart(4);
    return `${bar} ${percentText}`;
}
