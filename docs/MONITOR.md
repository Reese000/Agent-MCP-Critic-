# 📺 Monitor Dashboard: MACO Swarm Status

The MACO Swarm includes a real-time TUI (Terminal User Interface) monitor build with `blessed-contrib`. This provides high-visibility into agent interactions and blackboard state.

## 🚀 How to Launch
Run the batch file in the root directory:
```bash
start_monitor.bat
```

## 📊 Dashboard Components

### 1. Active Agents (Top Left)
- Displays current status (`IDLE`, `REASONING`, `EXECUTING`) for every agent in the swarm.
- Tracks Uptime and persona identification.

### 2. Blackboard State (Top Right)
- Real-time tree view of keys stored in shared memory.
- Useful for inspecting wave summaries and intermediate task data.

### 3. Interaction Feed (Bottom)
- Consolidated log stream from all active agents.
- Provides context for current tool executions and failures.

## 🛠️ Connectivity
The monitor connects to a local telemetry server on **Port 3001** (default). This port can be configured via `MACO_TELEMETRY_PORT` in the `.env` file.

> [!TIP]
> Use the monitor during complex `parallel_orchestrator` runs to ensure tasks are resolving correctly and dependencies are being respected.
