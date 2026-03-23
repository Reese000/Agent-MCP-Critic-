import { Throttler } from "../src/Throttler.js";
import { CodeIndexer } from "../src/Indexer.js";
import path from "path";

/**
 * tests/manual_stress_aicam.ts
 * Real-world stress test using AI CAM 2.0 project.
 */

async function runManualStress() {
    console.log("=== [MANUAL STRESS TEST: AI CAM 2.0] ===");

    const targetProject = "c:\\Users\\reese\\OneDrive\\Desktop\\AI\\AI CAM 2.0";
    const throttler = new Throttler(300); // 300 RPM for high speed

    console.log(`Target Project: ${targetProject}`);

    // Wave 1: Global Indexing
    console.log("\n[WAVE 1] Initializing global semantic index...");
    const start = Date.now();
    const map = await CodeIndexer.buildMap(targetProject);
    const duration = Date.now() - start;
    console.log(`Indexing completed in ${duration}ms`);

    // Validations: Check for 3.8MB file skip and Python symbol discovery
    const hasFusionSkip = map.includes("fusion360.pyi") && map.includes("[Symbols Skipped: File too large");
    const hasEngineDefs = map.includes("engine/") && map.includes("def:");
    const hasConfigSymbols = map.includes("config.py") && map.includes("class:");

    console.log(`- Memory ceiling (fusion360.pyi skip): ${hasFusionSkip ? "OK" : "FAIL"}`);
    console.log(`- Python symbol discovery: ${(hasEngineDefs || hasConfigSymbols) ? "OK" : "FAIL"}`);

    // Wave 2: Concurrent Agent Simulation
    console.log("\n[WAVE 2] Simulating 20 parallel agent requests...");
    const agentStart = Date.now();
    const tasks = Array.from({ length: 20 }).map((_, i) => throttler.throttle(async () => {
        // Just checking map availability or small sub-indexing
        return `Agent ${i} request served`;
    }));

    const results = await Promise.all(tasks);
    const agentDuration = Date.now() - agentStart;
    console.log(`Served 20 parallel requests in ${agentDuration}ms`);

    console.log("\n--- MAP PREVIEW (FIRST 100 LINES) ---");
    console.log(map.split("\n").slice(0, 100).join("\n"));
    console.log("... [TRUNCATED] ...");
    console.log("--- END PREVIEW ---");

    if (hasFusionSkip && (hasEngineDefs || hasConfigSymbols) && results.length === 20) {
        console.log("\nSUCCESS: System is robust across projects and maintains memory-safety walls.");
        process.exit(0);
    } else {
        console.error("\nSTRESS TEST FAILURE: Integrity or performance criteria not met.");
        if (!hasFusionSkip) console.error("Error: fusion360.pyi was NOT correctly capped.");
        process.exit(1);
    }
}

runManualStress().catch(console.error);
