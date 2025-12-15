//--------------------------------------------------------------
// FILE: src/discovery/discoveryPass.ts
// Deep-ish discovery over ChatGPT/Continuum mapping
//--------------------------------------------------------------
import { classifyParagraphToMIRA, } from "../utils/documentClassifier.js";
//--------------------------------------------------------------
// Main discovery function
//--------------------------------------------------------------
export function runDiscovery(root) {
    const mapping = root.mapping || {};
    const nodeIds = Object.keys(mapping);
    const nodeCount = nodeIds.length;
    let messageCount = 0;
    let hasPartsContent = false;
    let hasTextContent = false;
    const roleCounts = {};
    const miraHintCounts = {
        memory: 0,
        identity: 0,
        relationship: 0,
        agent: 0,
        unknown: 0,
    };
    const weightValues = [];
    let totalChars = 0;
    let totalParts = 0;
    let timestampMin = null;
    let timestampMax = null;
    for (const id of nodeIds) {
        const node = mapping[id];
        if (!node || !node.message)
            continue;
        const msg = node.message;
        messageCount++;
        //----------------------------
        // Roles
        //----------------------------
        const role = msg.author?.role ?? "unknown";
        roleCounts[role] = (roleCounts[role] || 0) + 1;
        //----------------------------
        // Content shape + text stats
        //----------------------------
        const content = msg.content;
        let text = "";
        if (content) {
            if (Array.isArray(content.parts)) {
                hasPartsContent = true;
                totalParts += content.parts.length;
                text = content.parts.join("\n");
            }
            else if (typeof content.text === "string") {
                hasTextContent = true;
                totalParts += 1;
                text = content.text;
            }
        }
        totalChars += text.length;
        //----------------------------
        // Weight field
        //----------------------------
        if (typeof msg.weight === "number" &&
            Number.isFinite(msg.weight)) {
            weightValues.push(msg.weight);
        }
        //----------------------------
        // Timestamps
        //----------------------------
        if (typeof msg.create_time === "number") {
            const ts = msg.create_time;
            if (timestampMin === null || ts < timestampMin) {
                timestampMin = ts;
            }
            if (timestampMax === null || ts > timestampMax) {
                timestampMax = ts;
            }
        }
        //----------------------------
        // MIRA hint classification
        //----------------------------
        let miraType = "unknown";
        // If loader/document already set a miraType in metadata, respect it
        const meta = msg.metadata;
        if (meta && typeof meta.miraType === "string") {
            const mt = meta.miraType;
            if (["memory", "identity", "relationship", "agent", "unknown"].includes(mt)) {
                miraType = mt;
            }
        }
        // Otherwise, infer from text using classifier (for chats)
        if (miraType === "unknown" && text.trim().length > 0) {
            const result = classifyParagraphToMIRA(text, "conversations.json");
            miraType = result.miraType;
        }
        if (!(miraType in miraHintCounts)) {
            miraHintCounts[miraType] = 0;
        }
        miraHintCounts[miraType] += 1;
    }
    //----------------------------
    // Weight field summary
    //----------------------------
    const detectedWeightFields = [];
    if (weightValues.length > 0) {
        const min = Math.min(...weightValues);
        const max = Math.max(...weightValues);
        const avg = weightValues.reduce((sum, v) => sum + v, 0) / weightValues.length;
        detectedWeightFields.push({
            field: "message.weight",
            min,
            max,
            average: avg,
        });
    }
    //----------------------------
    // Averages
    //----------------------------
    const avgCharsPerMessage = messageCount > 0 ? totalChars / messageCount : 0;
    const avgPartsPerMessage = messageCount > 0 ? totalParts / messageCount : 0;
    //----------------------------
    // Pretty log summary
    //----------------------------
    console.log("--------------------------------------------------");
    console.log("Discovery Pass Summary");
    console.log("--------------------------------------------------");
    console.log(`Nodes:        ${nodeCount}`);
    console.log(`Messages:     ${messageCount}`);
    console.log("Roles:");
    for (const [role, count] of Object.entries(roleCounts)) {
        console.log(`  - ${role}: ${count}`);
    }
    console.log("MIRA hint distribution:");
    for (const [type, count] of Object.entries(miraHintCounts)) {
        console.log(`  - ${type}: ${count}`);
    }
    console.log("Content shapes:");
    console.log(`  - parts[]: ${hasPartsContent}`);
    console.log(`  - text:    ${hasTextContent}`);
    if (detectedWeightFields.length) {
        const wf = detectedWeightFields[0];
        console.log("Weight field detected:");
        console.log(`  - ${wf.field} → min=${wf.min}, max=${wf.max}, avg=${wf.average.toFixed(3)}`);
    }
    else {
        console.log("No numeric weight field detected.");
    }
    console.log("Size stats:");
    console.log(`  - avg chars/message: ${avgCharsPerMessage.toFixed(1)}`);
    console.log(`  - avg parts/message: ${avgPartsPerMessage.toFixed(2)}`);
    if (timestampMin !== null && timestampMax !== null) {
        console.log("Timestamps:");
        console.log(`  - earliest: ${timestampMin}`);
        console.log(`  - latest:   ${timestampMax}`);
    }
    console.log("--------------------------------------------------");
    //----------------------------
    // Final meta object
    //----------------------------
    const meta = {
        detectedWeightFields,
        hasPartsContent,
        hasTextContent,
        messageCount,
        nodeCount,
        roleCounts,
        miraHintCounts,
        avgCharsPerMessage,
        avgPartsPerMessage,
        timestampMin,
        timestampMax,
    };
    return meta;
}
