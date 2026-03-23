import { Blackboard } from "../src/Blackboard.js";

async function runBlackboardTest() {
    console.log("=== [UNIT TEST: BLACKBOARD ROBUSTNESS] ===");
    const bb = new Blackboard();

    // 1. Generic Support Test
    console.log("Testing generic types...");
    const complexObj = { id: 1, data: ["a", "b"] };
    bb.set("obj", complexObj);
    const retrieved = bb.get<typeof complexObj>("obj");
    if (JSON.stringify(retrieved) === JSON.stringify(complexObj)) {
        console.log("SUCCESS: Generics validated.");
    } else {
        throw new Error("Generics validation failed.");
    }

    // 2. Clear Test
    bb.clear();
    if (bb.get("obj") === null) {
        console.log("SUCCESS: Clear validated.");
    }

    // 3. Concurrency / Locking Test
    console.log("Testing concurrency locks...");
    const key = "sync_key";
    
    // Simulate two agents trying to acquire a lock
    const p1 = bb.acquireLock(key);
    const p2 = bb.acquireLock(key, 100); // Short timeout

    const lock1 = await p1;
    console.log(`Agent 1 acquired lock: ${lock1}`);
    
    const lock2 = await p2;
    console.log(`Agent 2 acquired lock (expected false): ${lock2}`);

    if (lock1 === true && lock2 === false) {
        console.log("SUCCESS: Mutex locking validated.");
    } else {
        throw new Error("Concurrency locking failed.");
    }

    bb.releaseLock(key);
    const lock3 = await bb.acquireLock(key);
    console.log(`Agent 3 acquired lock after release: ${lock3}`);
    if (lock3 === true) {
        console.log("SUCCESS: Lock release validated.");
    }

    console.log("=== [BLACKBOARD TEST COMPLETE] ===");
}

runBlackboardTest().catch(e => {
    console.error(e);
    process.exit(1);
});
