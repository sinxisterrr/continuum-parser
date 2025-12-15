# Continuum Parser

**Adaptive memory extraction from ChatGPT/Claude conversation exports**

Continuum is a TypeScript-based parser that transforms raw conversation exports into structured, Substrate-compatible memory formats. It intelligently classifies dialogue into identity, relationships, episodic memories, and behavioral patterns through adaptive heuristics and clustering algorithms.

---

## Features

- **🧠 Intelligent Classification** – Automatically categorizes conversation content into MIRA channels (Memory, Identity, Relationship, Agent)
- **🔄 Adaptive Pipeline** – Discovery pass detects export structure, then extracts and deduplicates intelligently
- **⚡ Concurrent Processing** – Multi-threaded extraction with live progress visualization
- **🎯 Smart Deduplication** – Meaning-preserving cluster-based dedupe with importance boosting
- **🎨 Two UI Modes** – Clean standard interface or chaotic goblin mode (because why not)
- **📦 Multiple Input Formats** – Single JSON, JSON arrays, or folders of exports

---

## Installation

```bash
npm install
```

---

## Usage

### Basic Usage

```bash
npm run parse
```

This will process all files in the `./input/` directory.

### Supported File Types

- **JSON** – `.json` (ChatGPT/Claude exports, single or array format)
- **Text** – `.txt` (plain text conversations)
- **Documents** – `.doc`, `.docx` (Word documents)

Just drop your files into the `./input/` folder and run the parser.

### Goblin Mode

For those who prefer their parsers with personality:

```bash
npm run parse -- --goblin
```

Or set the environment variable:

```bash
GOBLIN_MODE=1 npm run parse
```

---

## How It Works

### 1. Discovery Pass

First, Continuum analyzes your export to understand its structure:

- Detects message formats (parts[] vs text fields)
- Identifies roles and weight fields
- Analyzes MIRA channel distribution
- Calculates conversation statistics

### 2. Thread Extraction

Conversations are decomposed into independent threads by walking the parent-child message graph.

### 3. Concurrent Processing

Threads are processed in parallel (default: 5 concurrent threads) with real-time progress tracking.

### 4. Memory Extraction

Each message is classified into one of four MIRA channels:

- **Memory** – Episodic events, temporal references, specific moments
- **Identity** – Self-descriptions, values, beliefs, core traits
- **Relationship** – Interpersonal dynamics, "we/us" patterns, shared experiences
- **Agent** – Preferences, boundaries, behavioral patterns, triggers

### 5. Intelligent Deduplication

Continuum uses cluster-based deduplication that:

- Groups semantically similar memories (Jaccard similarity threshold: 0.72)
- Selects the most representative/meaningful version from each cluster
- Boosts importance scores based on reinforcement frequency
- Preserves nuance while eliminating redundancy

### 6. Output Generation

Four JSON files are written to `./output/`:

- `persona_blocks.json` – Identity, relationship, and agent blocks
- `human_blocks.json` – User-side identity data (currently minimal)
- `archival_memories.json` – Deduplicated episodic memories with importance scores
- `stats.json` – Discovery metadata and processing statistics

---

## Dedupe Modes

When you run Continuum, you'll choose a deduplication strategy:

### Accurate Mode
- Full content comparison for deduplication
- Highest quality, slower processing
- Best for final production memory banks

### Fast Mode
- Truncated content comparison (first 80/100 chars)
- Much faster, slight quality tradeoff
- Great for iterative development

---

## Output Format

### Persona Blocks

```json
{
  "label": "identity",
  "block_type": "persona",
  "content": "Combined identity statements...",
  "description": "Auto-generated persona block (identity)",
  "metadata": {
    "miraType": "identity",
    "count": 42
  },
  "limit": 8192,
  "read_only": false
}
```

### Archival Memories

```json
{
  "id": "uuid-here",
  "content": "Representative memory text",
  "category": "episodic",
  "importance": 7,
  "timestamp": 1234567890,
  "tags": ["user", "mira:memory"],
  "metadata": {
    "cluster_size": 3,
    "representative": "Full representative text",
    "compressed": "core meaningful terms",
    "source_examples": ["variant 1", "variant 2"]
  }
}
```

---

## Architecture

```
src/
├── core/
│   ├── parse.ts          # CLI entry point
│   ├── pipeline.ts       # Main orchestration
│   ├── threads.ts        # Concurrent processing
│   └── postprocess.ts    # Final cleanup
├── discovery/
│   └── discoveryPass.ts  # Export structure analysis
├── extraction/
│   ├── extractionPass.ts # Memory extraction
│   ├── dedupePass.ts     # Cluster-based deduplication
│   └── rewriter.ts       # Text normalization
├── ui/
│   ├── renderer.ts       # UI orchestration
│   ├── progress.ts       # Progress bars
│   ├── goblin.ts         # Goblin mode renderer
│   └── colors.ts         # Terminal colors
├── utils/
│   ├── documentClassifier.ts  # MIRA channel classification
│   ├── helpers.ts        # Utility functions
│   └── types.ts          # Shared type definitions
└── types/
    ├── memory.ts         # Core memory types
    └── threads.ts        # Thread processing types
```

---

## MIRA Channel Classification

Continuum uses adaptive heuristics to classify content:

### Identity
- "I am", "I believe", "my values"
- Self-descriptions and core beliefs
- File paths containing "identity", "values", "about"

### Relationship
- "We", "us", "our dynamic"
- Interpersonal patterns and shared experiences
- File paths containing "relationship", "ritual"

### Agent
- "I prefer", "I avoid", "my boundaries"
- Behavioral patterns and response modes
- File paths containing "agent", "behavior", "prefs"

### Memory
- Temporal references, specific events
- "Yesterday", "last night", "that time when"
- File paths containing dates or "memory", "diary"

---

## Configuration

### Concurrency

Edit `CONCURRENCY` in `src/core/threads.ts` (default: 5)

### Similarity Threshold

Edit `isNearDuplicate()` threshold in `src/extraction/dedupePass.ts` (default: 0.72)

### Progress Simulation Speed

Edit timeout values in `handleThread()` in `src/core/threads.ts`

---

## Compatibility

Designed for ChatGPT conversation exports but adaptable to other formats. The discovery pass automatically detects:

- OpenAI's `conversations.json` format
- Array-based exports (multiple conversations)
- Folder-based exports (multiple files)
- Custom message structures with metadata

---

## Why "Continuum"?

Memory isn't discrete snapshots - it's a continuous, evolving substrate where meaning emerges from patterns and connections. Continuum treats conversation history as raw material for building a living memory architecture.

---

## Goblin Mode

`--goblin` enables an alternative UI theme featuring:
- Aggressive progress indicators
- Chaotic but functional status messages
- The spirit of goblin-ash watching over your parsing

It's the same parser, just with more teeth.

---

## Future Enhancements

- LLM-powered rewriting for higher-quality memory statements
- Semantic embeddings for better clustering
- Incremental parsing (process new exports without full reparse)
- Custom classification rule injection
- Memory graph visualization

---

## License

MIT

---

## Credits

Built for parsing conversations into substrate-compatible memory formats. Inspired by the need to transform raw dialogue into structured, queryable knowledge.

*"Your conversations contain multitudes. Let's extract them."*