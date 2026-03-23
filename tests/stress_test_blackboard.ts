import { Blackboard } from "../src/Blackboard.js";
import { telemetry } from "../src/Telemetry.js";

/**
 * tests/stress_test_blackboard.ts
 * High-concurrency stress test to prove the robustness of the locking mechanism.
 */

async function worker(id: number, iterations: number, bb: Blackboard) {
    for (let i = 0; i < iterations; i++) {
        await bb.runWithLock("counter", async () => {
            const current = bb.get<number>("counter") || 0;
            bb.set("counter", current + 1);
            // Simulate some work
            await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        });
    }
}

async function runStressTest() {
    console.log("=== [CONCURRENCY STRESS TEST: STARTING] ===");
    const bb = new Blackboard();
    bb.set("counter", 0);

    const numWorkers = 5;
    const iterationsPerWorker = 10;
    
    console.log(`Spawning ${numWorkers} workers with ${iterationsPerWorker} iterations each...`);
    
    const workers = [];
    for (let i = 0; i < numWorkers; i++) {
        workers.push(worker(i, iterationsPerWorker, bb));
    }

    await Promise.all(workers);

    const finalCount = bb.get<number>("counter");
    console.log(`Final Counter Value: ${finalCount}`);
    const expected = numWorkers * iterationsPerWorker;

    if (finalCount === expected) {
        console.log("SUCCESS: High-concurrency race condition prevented via locking.");
    } else {
        console.error(`FAILURE: Expected ${expected}, but got ${finalCount}. Race condition occurred!`);
        process.exit(1);
    }
    
    console.log("=== [CONCURRENCY STRESS TEST: COMPLETE] ===");
    process.exit(0);
}

runStressTest().catch(e => {
    console.error(e);
    process.exit(1);
});
