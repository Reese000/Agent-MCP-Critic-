import { Throttler } from "../src/Throttler.js";

/**
 * tests/test_throughput_audit_s3.ts
 * Verifies high-concurrency throughput in the refactored Throttler.
 */

async function runThroughputAudit() {
    console.log("=== [SECTION 3 AUDIT: THROTTLER THROUGHPUT] ===");

    // Set RPM to 120 (1 request every 500ms)
    const throttler = new Throttler(120);
    const taskCount = 5;
    const taskDuration = 2000; // 2 seconds per task
    
    console.log(`Config: RPM=120 (500ms interval), Tasks=${taskCount}, TaskDuration=${taskDuration}ms`);
    console.log("Note: Old throttler would take ~10s (serial). New should take ~4s (overlapped).");

    const start = Date.now();
    const tasks = Array.from({ length: taskCount }).map((_, i) => {
        return throttler.throttle(async () => {
            const taskStart = Date.now() - start;
            console.log(`[TASK ${i}] Started at T+${taskStart}ms`);
            await new Promise(resolve => setTimeout(resolve, taskDuration));
            const taskEnd = Date.now() - start;
            console.log(`[TASK ${i}] Finished at T+${taskEnd}ms`);
            return i;
        });
    });

    const results = await Promise.all(tasks);
    const totalTime = Date.now() - start;

    console.log(`\nResults: ${results.join(", ")}`);
    console.log(`Total Execution Time: ${totalTime}ms`);

    // Verification Logic:
    // If it was serial, it would take at least taskCount * taskDuration = 5 * 2000 = 10000ms.
    // With concurrency, it should take ~ (taskCount-1)*500 + 2000 = 4000ms.
    if (totalTime < 6000) {
        console.log("SUCCESS: Throttler achieved true concurrency!");
        process.exit(0);
    } else {
        console.error("FAILURE: Throttler is still behaving sequentially.");
        process.exit(1);
    }
}

runThroughputAudit().catch(console.error);
