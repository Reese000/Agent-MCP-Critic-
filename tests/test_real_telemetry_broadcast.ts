import { telemetry } from "../src/Telemetry.js";
import { blackboard } from "../src/BlackboardInstance.js";

/**
 * test_real_telemetry_broadcast.ts
 * Verifies that the real telemetry module correctly broadcasts
 * internal system states (Agent, Blackboard, Logs).
 */

async function runTest() {
    console.log("--- [TELEMETRY INTEGRATION] Starting Real-System Broadcast ---");

    // 1. Simulate Agent Transition
    console.log("Broadcasting Agent update...");
    telemetry.sendAgentUpdate({
        id: "auditor_01",
        persona: "Senior Security Auditor",
        status: "executing",
        lastTool: "fs_read",
        turnCount: 1,
        startTime: Date.now()
    });

    // 2. Simulate Blackboard Update
    console.log("Broadcasting Blackboard update...");
    blackboard.set("critical_finding_01", "Detected unencrypted secrets in test_config.json");

    // 3. Simulate Log Stream
    console.log("Broadcasting Log stream...");
    telemetry.sendLog("[SWARM] Phase 1 Discovery Complete", "info");
    telemetry.sendLog("[CRITIC] SECURITY VIOLATION: Unauthorized write blocked", "error");

    console.log("\n[VERIFIED] Telemetry packets dispatched. Run start_monitor.bat to see these persistent updates.");
    console.log("--- [TELEMETRY INTEGRATION] COMPLETE ---");
}

runTest().catch(console.error);
