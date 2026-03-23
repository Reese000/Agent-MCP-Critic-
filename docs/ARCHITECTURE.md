# 🏗️ Architecture: MACO Swarm System

The MACO (Multi-Agent Compartmentalized Orchestration) Swarm is built on a modular, event-driven architecture designed for high-concurrency autonomous operations.

## 🧩 System Modules

### 1. The Orchestrator (`src/orchestrator.ts`)
The central brain of the swarm. It resolves a complex manifest of tasks into sequential "waves" based on dependency mapping.
- **Wave Logic**: Tasks with no dependencies run in the first wave. Subsequent tasks wait for their parents to complete.
- **Context Injection**: Each wave's results are summarized and injected into the context of the next wave to eliminate token bloom.

### 2. The Throttler (`src/Throttler.ts`)
A zero-tolerance rate-limiting engine that serializes API and I/O requests.
- **Strict Interval**: Enforces a time-based gap between requests (e.g., 200ms for 300 RPM).
- **Concurrency**: Manages parallel execution while preventing 429 Rate Limit errors.

### 3. The Indexer (`src/Indexer.ts`)
A high-density semantic mapping tool.
- **Regex Extraction**: Identifies Classes, Functions, and Arrow functions without full AST parsing.
- **Memory Safety**: Implements a 50KB/300-line read ceiling to handle massive files (like type stubs) safely.

### 4. Telemetry & Monitor (`src/Telemetry.ts`, `src/monitor.ts`)
- **Broadcaster**: Uses a local TCP socket to stream agent state changes.
- **TUI Monitor**: A `blessed`-based dashboard for real-time visualization of the "Blackboard" (swarm memory) and interaction feeds.

## 🔄 Interaction Flow

1. **Manifest Load**: Orchestrator receives a JSON task list.
2. **Wave Resolution**: Tasks are grouped by dependencies.
3. **Persona Optimization**: Each agent receives a specialized system prompt.
4. **Action Cycle**: Agents call tools (Filesystem, CodeSearch, etc.) thru the Throttler.
5. **Critique Loop**: Major changes are submitted to the Critic for approval.
6. **Consolidation**: Wave results are persisted to the Blackboard and summarized for the next wave.
