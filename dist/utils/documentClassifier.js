// -------------------------------------------------------------
// FILE: src/utils/documentClassifier.ts
// Adaptive heuristics for mapping document text → MIRA channel
// IMPROVED: Better pattern matching and scoring
// -------------------------------------------------------------
function baseScores() {
    return { memory: 0, identity: 0, relationship: 0, agent: 0 };
}
// Lightweight normalization
function norm(text) {
    return text.toLowerCase();
}
/**
 * Boost scores based on file path (folder & filename).
 */
function applyFilePathHeuristics(scores, filePath) {
    const p = norm(filePath);
    if (p.includes("identity") || p.includes("about") || p.includes("self")) {
        scores.identity += 3;
    }
    if (p.includes("values")) {
        scores.identity += 2;
    }
    if (p.includes("relationship") || p.includes("relational") || p.includes("attachment")) {
        scores.relationship += 3;
    }
    if (p.includes("ritual") || p.includes("rituals")) {
        scores.relationship += 2;
    }
    if (p.includes("agent") || p.includes("behavior") || p.includes("prefs")) {
        scores.agent += 3;
    }
    if (p.includes("boundary") || p.includes("boundaries")) {
        scores.agent += 2;
    }
    if (p.includes("memory") ||
        p.includes("memories") ||
        p.includes("diary") ||
        p.includes("journal") ||
        p.match(/\d{4}-\d{2}-\d{2}/)) {
        scores.memory += 3;
    }
}
/**
 * Boost scores based on paragraph content
 * IMPROVED: More patterns, better weighting
 */
function applyContentHeuristics(scores, paragraph) {
    const t = norm(paragraph);
    // ===== IDENTITY PATTERNS =====
    // Strong identity markers
    if (/\bi am\b|\bi'm\b/.test(t))
        scores.identity += 3;
    if (/\bmy name is\b|\bcall me\b/.test(t))
        scores.identity += 4;
    if (/\bi believe\b|\bi think\b|\bmy values?\b/.test(t))
        scores.identity += 2;
    if (/\bwhat matters to me\b|\bwho i am\b/.test(t))
        scores.identity += 3;
    // Self-description patterns
    if (/\bi feel like\b|\bpart of me\b|\bmy personality\b/.test(t))
        scores.identity += 2;
    if (/\bas a person\b|\bmy identity\b/.test(t))
        scores.identity += 3;
    // ===== RELATIONSHIP PATTERNS =====
    // Strong relational markers
    if (/\bwe\b.*\b(are|were|have|share|do)\b/.test(t))
        scores.relationship += 3;
    if (/\bour relationship\b|\bbetween us\b|\bhow we are\b/.test(t))
        scores.relationship += 4;
    if (/\byou and (i|me)\b|\b(you|i) and (you|me)\b/.test(t))
        scores.relationship += 2;
    // Interaction patterns
    if (/\bwhen you\b|\bwhen we\b/.test(t))
        scores.relationship += 2;
    if (/\bargument\b|\bfight\b|\bmake up\b|\brepair\b|\bconflict\b/.test(t))
        scores.relationship += 3;
    if (/\btrust\b|\battachment\b|\bbond\b/.test(t))
        scores.relationship += 2;
    // ===== AGENT/BEHAVIORAL PATTERNS =====
    // Preferences and behaviors
    if (/\bi prefer\b|\bi like to\b|\bi tend to\b|\bi usually\b/.test(t))
        scores.agent += 3;
    if (/\bi avoid\b|\bi don't like\b|\bi won't\b|\bi hate\b/.test(t))
        scores.agent += 3;
    if (/\bmy boundary\b|\bmy boundaries\b|\bmy limits?\b/.test(t))
        scores.agent += 4;
    if (/\bi need\b|\bi want\b|\bi expect\b/.test(t))
        scores.agent += 2;
    // Response patterns
    if (/\bwhen I feel\b|\bwhen I'm triggered\b|\bi respond by\b/.test(t))
        scores.agent += 4;
    if (/\bmy habit\b|\bmy routine\b|\bmy pattern\b/.test(t))
        scores.agent += 3;
    // ===== MEMORY/EPISODIC PATTERNS =====
    // Time references
    if (/\byesterday\b|\btoday\b|\blast night\b|\bearlier\b|\bback then\b/.test(t)) {
        scores.memory += 3;
    }
    if (/\bon (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(t)) {
        scores.memory += 3;
    }
    if (/\blast (week|month|year)\b|\bago\b/.test(t))
        scores.memory += 2;
    // Date patterns
    if (/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(t)) {
        scores.memory += 2;
    }
    if (/\b(19|20)\d{2}\b/.test(t))
        scores.memory += 1; // year
    // Event markers
    if (/\b(first|last) time\b|\bthe time when\b|\bthat day\b/.test(t))
        scores.memory += 3;
    if (/\bremember when\b|\bdo you remember\b/.test(t))
        scores.memory += 4;
    if (/\bhappened\b|\boccurred\b|\btook place\b/.test(t))
        scores.memory += 2;
    // ===== DISAMBIGUATION =====
    // If something could be identity OR relationship, break ties
    if (scores.identity > 0 && scores.relationship > 0) {
        // "we" statements lean relationship
        if (/\bwe\b/.test(t))
            scores.relationship += 1;
        // "I am" statements lean identity
        if (/\bi am\b/.test(t))
            scores.identity += 1;
    }
    // If something could be memory OR identity/relationship, check for time
    if (scores.memory > 0 && (scores.identity > 0 || scores.relationship > 0)) {
        // Strong time markers push toward memory
        if (/\b(yesterday|today|ago|when|time|day|date)\b/.test(t)) {
            scores.memory += 2;
        }
    }
}
/**
 * Classify a paragraph to a MIRA channel
 */
export function classifyParagraphToMIRA(paragraph, filePath, docBias) {
    const scores = baseScores();
    applyFilePathHeuristics(scores, filePath);
    applyContentHeuristics(scores, paragraph);
    if (docBias) {
        scores.memory += docBias.memory ?? 0;
        scores.identity += docBias.identity ?? 0;
        scores.relationship += docBias.relationship ?? 0;
        scores.agent += docBias.agent ?? 0;
    }
    // Choose the max; if everything is 0, it's unknown
    const entries = [
        ["memory", scores.memory],
        ["identity", scores.identity],
        ["relationship", scores.relationship],
        ["agent", scores.agent],
    ];
    entries.sort((a, b) => b[1] - a[1]);
    const [bestType, bestScore] = entries[0];
    const [secondType, secondScore] = entries[1];
    // Only classify if there's a clear winner (margin of at least 1 point)
    const miraType = bestScore > 0 && (bestScore - secondScore >= 1) ? bestType : "unknown";
    return { miraType, scores };
}
