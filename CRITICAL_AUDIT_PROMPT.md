# 🛡️ MISSION: Red-Team Audit of Critic-MCP v1.6.0 (Stabilized)

You are being deployed to perform a **High-Fidelity Restoration Audit** of the MACO Swarm Critic-MCP server. A previous architect has implemented a **VBScript Stability Bridge** to solve session-suppression issues in the Google Antigravity/Cursor environment. Your objective is to verify that these changes are resilient, that the telemetry is accurate, and that the new TUI features function exactly as documented.

---

## 🛠️ ENVIRONMENT CONTEXT
- **OS**: Windows (Standard or Antigravity/Cursor runner).
- **Core Strategy**: The server auto-launches a CLI monitor using `launcher.vbs`.
- **Infrastructure**: Telemetry is broadcasted via TCP (Port 3001) and persisted to `swarm_state.json`.

---

## 📋 TEST MATRIX

### Phase 1: Build Integrity
Verify that the recent TypeScript modifications for state persistence and streaming updates are compile-safe.
- **Action**: Run `npm run build`.
- **Success Criteria**: Zero `tsc` errors. `dist/index.js` and `dist/Telemetry.js` are updated.

### Phase 2: Launch Resilience (The Bridge Test)
Confirm the VBScript bridge bypasses shell-quoting issues.
- **Action**: Locate `src/index.ts` and inspect the `runServer()` function (line 1000+). Ensure it spawns `wscript.exe` with `launcher.vbs`.
- **Action**: Manual Trigger. Run `.\start_monitor.bat` in a terminal.
- **Success Criteria**: A new terminal window opens instantly with the MACO Swarm Monitor TUI. Verify no "Windows cannot find..." dialogs appear.

### Phase 3: Telemetry Fidelity (At-Rest Persistence)
Verify that the `swarm_state.json` bridge is accurately synchronizing the swarm state.
- **Action**: Launch the server (via `node dist/index.js` or through the Antigravity MCP settings).
- **Action**: Perform a dummy agent update using the telemetry mock scripts (if available) or by observing a real agent turn.
- **Success Criteria**: `swarm_state.json` is created/updated in the project root. It MUST contain:
    - `agents` array with IDs, status, and progress.
    - `logs` array with the latest system activity.
    - `lastUpdated` timestamp.

### Phase 4: UI Features (Stress Test)
Verify the new "Premium TUI" features in the monitor window.
- **Action**: In the Monitor Window, observe:
    - [ ] **Color Status**: Are "reasoning" (orange) and "executing" (blue) tags color-coded?
    - [ ] **Progress Bars**: Do progress percentages render correctly?
    - [ ] **Thought Streaming**: Press the **`p`** hotkey.
- **Success Criteria**: The `p` hotkey toggles a detail-view overlay that shows real-time text/thought logs for the selected agent.

### Phase 5: Protocol Enforcement (Security)
Ensure the `ProtocolFilter` still guards the system.
- **Action**: Attempt a file-write tool call without an explicit `_sys_critique_status: "APPROVED"`.
- **Success Criteria**: The server MUST block the tool call with a protocol violation message.

---

## 🚨 ESCALATION CRITERIA
If any of the following occur, mark the audit as **FAILED**:
1. `start_monitor.bat` opens a window that "flashes and disappears" instantly.
2. `swarm_state.json` fails to sync after 2+ agent turns.
3. The server crashes upon `EADDRINUSE` for port 3001 without a graceful error message.

---
**REPORT FORMAT**: Provide a `walkthrough.md` summarizing your findings for each phase of this mission.
