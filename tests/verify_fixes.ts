import { FilesystemHandler } from "../src/FilesystemHandler.js";
import { blackboard } from "../src/BlackboardInstance.js";

async function main() {
    console.log("--- STARTING VERIFICATION ---\n");

    // 1. Verify FilesystemHandler Optimization
    console.log("1. Testing FilesystemHandler.search optimization...");
    const start = Date.now();
    // Use the actual repo root
    const root = process.cwd(); 
    const results = await FilesystemHandler.search(root, "package.json");
    const duration = Date.now() - start;
    
    console.log(`Results: ${JSON.stringify(results)}`);
    console.log(`Duration: ${duration}ms`);
    
    const nodeModulesFound = results.some(r => r.includes("node_modules"));
    if (nodeModulesFound) {
        console.error("FAILED: node_modules was NOT excluded!");
    } else {
        console.log("SUCCESS: node_modules correctly excluded.");
    }
    console.log("");

    // 2. Verify Blackboard Persistence
    console.log("2. Testing Blackboard persistence...");
    // Bypass the setter check to simulate internal system state update
    (blackboard as any).state["_sys_critique_status"] = "APPROVED";
    blackboard.set("temp_key", "gone");
    
    console.log("Initial state:", JSON.stringify(blackboard.getAll()));
    console.log("Calling blackboard.clear()...");
    blackboard.clear();
    
    const finalState = blackboard.getAll();
    console.log("Final state:", JSON.stringify(finalState));
    
    if (finalState["_sys_critique_status"] === "APPROVED" && finalState["temp_key"] === undefined) {
        console.log("SUCCESS: System state preserved, temporary data cleared.");
    } else {
        console.error("FAILED: State preservation logic failed!");
    }
}

main().catch(e => {
    console.error("Verification script failed:", e);
    process.exit(1);
});
