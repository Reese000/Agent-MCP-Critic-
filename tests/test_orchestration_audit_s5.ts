import { Throttler } from "../src/Throttler.js";
import { CodeIndexer } from "../src/Indexer.js";
import crypto from "crypto";

/**
 * tests/test_orchestration_audit_s5.ts (Zero-Tolerance Hardened)
 * Stress tests the orchestration layer with zero-tolerance timestamp metrics.
 */

async function runOrchestrationStressTest() {
    console.log("=== [SECTION 5 AUDIT: SWARM ORCHESTRATION STRESS TEST] ===");

    // 300 RPM = Exactly 1 task every 200ms.
    const throttler = new Throttler(300); 
    const root = process.cwd();

    console.log("Simulating 10 parallel agents with zero-tolerance metrics...");

    const startTime = Date.now();
    const timestamps: number[] = [];
    const hashes: string[] = [];

    const agentTasks = Array.from({ length: 10 }).map((_, i) => {
        return throttler.throttle(async () => {
            const now = Date.now();
            timestamps.push(now);
            console.log(`[Agent ${i}] Starting at T+${now - startTime}ms`);
            
            const map = await CodeIndexer.buildMap(root);
            // Strip dynamic timestamp for deterministic hashing
            const deterministicMap = map.split("\n").filter(l => !l.startsWith("Index Time:")).join("\n");
            
            const hash = crypto.createHash("sha256").update(deterministicMap).digest("hex");
            hashes.push(hash);
            
            return { id: i, hash };
        });
    });

    try {
        const results = await Promise.all(agentTasks);
        const duration = Date.now() - startTime;

        console.log("\n--- AUDIT RESULTS ---");
        console.log(`Total Duration: ${duration}ms`);
        
        console.log("\n1. Verifying Rate Limit (Strict 200ms+ Interval):");
        let rateFailures = 0;
        for (let i = 1; i < timestamps.length; i++) {
            const delta = timestamps[i] - timestamps[i-1];
            // ZERO TOLERANCE: Must be at least 200ms.
            const isOk = delta >= 200; 
            console.log(`   - Task Delta ${i}: ${delta}ms | ${isOk ? "OK" : "FAIL"}`);
            if (!isOk) rateFailures++;
        }

        console.log("\n2. Verifying State Integrity (SHA-256 Hashing):");
        const uniqueHashes = new Set(hashes);
        const integrityOk = uniqueHashes.size === 1;
        console.log(`   - Unique Hashes: ${uniqueHashes.size} (Expected 1) | ${integrityOk ? "OK" : "FAIL"}`);

        if (rateFailures === 0 && integrityOk && results.length === 10) {
            console.log("\nSUCCESS: Orchestration metrics pass strict RPM and Integrity requirements.");
            process.exit(0);
        } else {
            console.error("\nFAILURE: Robustness criteria not met.");
            if (rateFailures > 0) console.error(`Error: ${rateFailures} rate limit violations detected (delta < 200ms).`);
            if (!integrityOk) console.error("Error: State corruption detected - map hashes diverged.");
            process.exit(1);
        }
    } catch (error: any) {
        console.error("\nCRITICAL ORCHESTRATION ERROR:");
        console.error(error.stack || error);
        process.exit(1);
    }
}

runOrchestrationStressTest().catch((err) => {
    console.error("Unhandle rejection in Stress Test:", err);
    process.exit(1);
});
