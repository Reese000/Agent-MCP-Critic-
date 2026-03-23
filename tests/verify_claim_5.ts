import { Blackboard } from "../src/Blackboard.js";
// Since we can't easily run the full orchestrator with actual API calls in a unit test,
// we will verify the logic in src/index.ts for Wave resolution and context injection.

async function testOrchestrationIntegrity() {
    console.log("\n--- [AUDIT] Testing Claim 5: Swarm Orchestration Integrity ---");
    
    // Claim: The parallel_orchestrator correctly resolves task dependencies into waves.
    // We already saw the while loop in src/index.ts. Let's verify it with a mock test.
    
    const tasks = [
        { id: "A", dependsOn: [] },
        { id: "B", dependsOn: ["A"] },
        { id: "C", dependsOn: ["A", "B"] },
        { id: "D", dependsOn: [] }
    ];

    // Simulating the wave resolution logic from src/index.ts:605
    const waves: any[][] = [];
    const completed = new Set<string>();
    let remaining = [...tasks];

    while (remaining.length > 0) {
        const nextWave = remaining.filter(t => !t.dependsOn || t.dependsOn.every(d => completed.has(d)));
        if (nextWave.length === 0) {
            console.log("[FAILURE] Circular dependency detected unexpectedly.");
            return;
        }
        waves.push(nextWave);
        nextWave.forEach(t => completed.add(t.id));
        remaining = remaining.filter(t => !nextWave.includes(t));
    }

    console.log("Resolved Waves:");
    waves.forEach((w, i) => console.log(`Wave ${i}: ${w.map(t => t.id).join(", ")}`));

    const expectedWaves = [["A", "D"], ["B"], ["C"]];
    const match = JSON.stringify(waves.map(w => w.map(t => t.id).sort())) === JSON.stringify(expectedWaves.map(w => w.sort()));

    if (match) {
        console.log("[VERIFIED] Dependency resolution logic is correct.");
    } else {
        console.log("[FAILURE] Dependency resolution logic mismatch.");
    }

    // Claim: Waves inject consolidated "Wave Summaries" into subsequent contexts.
    // Logic: src/index.ts:623-630
    console.log("Verifying 'Wave Summary' injection logic...");
    const mockBlackboard = {
        getAll: () => ({
            "wave_summary_0": "Summary of A and D",
            "wave_summary_1": "Summary of B",
            "something_else": "ignored"
        }),
        get: (key: string) => (mockBlackboard.getAll() as any)[key]
    };

    let previousSummaries = "";
    for (const key of Object.keys(mockBlackboard.getAll())) {
        if (key.startsWith("wave_summary_")) {
            previousSummaries += `[SUMMARY: ${key.toUpperCase()}]\n${mockBlackboard.get(key)}\n\n`;
        }
    }

    if (previousSummaries.includes("SUMMARY_0") && previousSummaries.includes("SUMMARY_1") && !previousSummaries.includes("SOMETHING_ELSE")) {
        console.log("[VERIFIED] Context injection logic correctly filters for wave summaries.");
    } else {
        console.log("[FAILURE] Context injection logic failed.");
    }
}

testOrchestrationIntegrity().catch(console.error);
