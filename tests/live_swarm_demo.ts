import { telemetry } from "../src/Telemetry.js";
import { blackboard } from "../src/BlackboardInstance.js";

/**
 * live_swarm_demo.ts
 * Generates a persistent stream of telemetry to the MACO Monitor.
 * Lasts for 60 seconds.
 */

async function runDemo() {
    console.log("--- [LIVE SWARM DEMO] Starting 60s Telemetry Stream ---");
    console.log("Check your MACO Monitor NOW.");

    const personas = ["RESEARCHER", "DEVELOPER", "AUDITOR", "CRITIC", "SECURITY_BOT"];
    const tools = ["fs_list", "fs_read", "fs_write", "code_index", "bb_get"];

    for (let i = 0; i < 60; i++) {
        const id = `agent_${(i % 3) + 1}`;
        const persona = personas[i % personas.length];
        const status = i % 2 === 0 ? "reasoning" : "executing";
        const tool = tools[Math.floor(Math.random() * tools.length)];

        // 1. Agent Pulse
        telemetry.sendAgentUpdate({
            id,
            persona,
            status,
            lastTool: status === "executing" ? tool : undefined,
            turnCount: i,
            startTime: Date.now() - 10000
        });

        // 2. Blackboard Pulse
        if (i % 5 === 0) {
            blackboard.set(`task_key_${i}`, `Result_${Math.random().toString(36).substring(7)}`);
        }

        // 3. Log Pulse
        const levels: ("info" | "warn" | "error")[] = ["info", "warn", "error"];
        telemetry.sendLog(`[${id}] ${persona} ${status} turn ${i}...`, levels[i % 3]);

        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("--- [LIVE SWARM DEMO] COMPLETE ---");
}

runDemo().catch(console.error);
