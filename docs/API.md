# 🛠️ API Specification: Critic MCP Tools

The **Critic** MCP server exposes a suite of powerful tools for autonomous file management, codebase indexing, and multi-agent orchestration.

## 🧠 Core Orchestration

### `parallel_orchestrator`
Executes compartmentalized tasks in parallel with dependency resolution.
- **Parameters**: `tasks` (Array: {id, description, persona, dependsOn}), `concurrency` (Number), `optimization_rounds` (Number).
- **Result**: Comprehensive JSON mapping of task outputs, personas, and execution logs.

### `agent_debate`
Orchestrates a competitive debate between two agent personas to refine technical solutions.
- **Parameters**: `topic`, `position_a`, `position_b`, `max_turns`.

## 📁 Filesystem & Discovery

### `fs_list` / `fs_read` / `fs_write`
Standard file operations with built-in security guards for system directories.

### `code_index`
Builds a semantic map of a directory to minimize token use during discovery.
- **Support**: `.ts`, `.js`, `.py`, `.pyi`, `.md`, `.tsx`, `.jsx`.
- **Ceiling**: 50KB / 300-line read limit per file for memory safety.

### `code_search`
Fast, grep-based semantic search across the codebase.

## 🗺️ Shared Memory (Blackboard)

### `bb_get` / `bb_set` / `bb_list` / `bb_clear`
Inter-agent memory system used for data persistence across orchestration waves.
- **Wave Summaries**: Stored with `wave_summary_{index}` keys for automatic context injection.
