import { FilesystemHandler } from "../src/FilesystemHandler.js";
import { Throttler, apiThrottler } from "../src/Throttler.js";
import { CodeIndexer } from "../src/Indexer.js";
import path from "path";

async function testSecurityGuards() {
    console.log("\n--- [AUDIT] Testing Claim 4: Protocol Security Guards ---");
    const testPaths = [
        path.resolve("src/index.ts"),
        path.resolve(".git/config"),
        path.resolve(".antigravity/state.json"),
        path.resolve("package.json"),
        path.resolve("package-lock.json")
    ];

    for (const p of testPaths) {
        try {
            console.log(`Attempting to write to protected path: ${p}`);
            const res = await FilesystemHandler.write(p, "AUDIT_TEST");
            console.log(`[VIOLATION] Successfully wrote to supposedly protected path: ${p}`);
        } catch (e: any) {
            console.log(`[VERIFIED] Correctly denied access to ${p}: ${e.message}`);
        }
    }
}

async function testThrottler() {
    console.log("\n--- [AUDIT] Testing Claim 2: Throttler & Concurrency ---");
    // Target claim: 200ms interval (300 RPM)
    // Actually configured in src/Throttler.ts: 30 RPM (2000ms)
    
    const throttler = new Throttler(300); // Test if a 300 RPM throttler actually works
    const timestamps: number[] = [];
    const tasks = Array.from({ length: 10 }, (_, i) => async () => {
        timestamps.push(Date.now());
        return i;
    });

    await Promise.all(tasks.map(t => throttler.throttle(t)));

    console.log("Timestamps:", timestamps);
    let violations = 0;
    for (let i = 1; i < timestamps.length; i++) {
        const diff = timestamps[i] - timestamps[i-1];
        console.log(`Interval ${i}: ${diff}ms`);
        if (diff < 190) { // Allowing 10ms jitter
            violations++;
        }
    }
    
    if (violations > 0) {
        console.log(`[FAILURE] Throttler violation! ${violations} intervals < 190ms`);
    } else {
        console.log("[VERIFIED] Throttler interval enforcement OK at 300 RPM.");
    }
    
    console.log("\nVerifying system default 'apiThrottler' (Claimed 300 RPM but code says 30 RPM):");
    const sysTimestamps: number[] = [];
    await Promise.all(Array.from({ length: 3 }, (_, i) => apiThrottler.throttle(async () => {
        sysTimestamps.push(Date.now());
    })));
    const sysDiff = sysTimestamps[1] - sysTimestamps[0];
    console.log(`System apiThrottler Interval: ${sysDiff}ms`);
    if (sysDiff > 1800 && sysDiff < 2200) {
        console.log("[FINDING] System 'apiThrottler' is actually set to 30 RPM (2s delay), NOT 300 RPM as claimed.");
    }
}

async function testIndexing() {
    console.log("\n--- [AUDIT] Testing Claim 3: Hardened Indexing ---");
    // We expect fusion360.pyi (3.8MB) to be capped.
    const pyiPath = "c:\\Users\\reese\\OneDrive\\Desktop\\AI\\AI CAM 2.0"; 
    
    try {
        console.log(`Searching directory: ${pyiPath}`);
        const files = await FilesystemHandler.search(pyiPath, ".*");
        console.log(`Found ${files.length} files in ${pyiPath}`);
        const found = files.find(f => f.toLowerCase().endsWith("fusion360.pyi"));
        if (found) {
            console.log(`Found fusion360.pyi at: ${found}`);
            const content = await FilesystemHandler.read(found);
            console.log(`File size: ${content.length} bytes`);
        } else {
            console.log("fusion360.pyi NOT found in search results.");
        }

        const map = await CodeIndexer.buildMap(pyiPath);
        if (map.includes("[Symbols Skipped: File too large]")) {
            console.log("[VERIFIED] Indexer correctly identified and capped large file.");
        } else {
            console.log("[FAILURE] Indexer FAILED to cap large file.");
            // console.log("Partial Map:\n", map.substring(0, 500));
        }
    } catch (e: any) {
        console.log(`[ERROR] Indexer test failed: ${e.message}`);
    }
}

async function runAudit() {
    await testSecurityGuards();
    await testThrottler();
    await testIndexing();
}

runAudit().catch(console.error);
