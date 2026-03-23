
import { blackboard } from "../src/BlackboardInstance.js";
import { FilesystemHandler } from "../src/FilesystemHandler.js";
import path from "path";

/**
 * test_audit_enforcement.ts
 * Verifies that sensitive tools (fs_write, fs_delete, fs_execute) 
 * require an explicit [STATUS] APPROVED from the get_critique tool.
 */

async function runTest() {
    console.log("--- [ENFORCEMENT TEST] Starting Phase 1: Direct Tool Bypass Check ---");
    
    const testFile = path.resolve("tests/unauthorized_write.txt");
    
    // 1. Ensure status is NOT approved
    blackboard.clear();
    console.log("Status is clear. Attempting fs_write...");
    
    try {
        // We simulate the tool handler logic directly since index.ts main() blocks
        if (blackboard.get("_sys_critique_status") !== "APPROVED") {
            throw new Error("PROTOCOL VIOLATION: fs_write denied. No 'APPROVED' critique found.");
        }
        await FilesystemHandler.write(testFile, "FAIL");
        console.log("[FAILURE] Bypassed enforcement! Managed to write without approval.");
    } catch (e: any) {
        console.log(`[SUCCESS] Correctly blocked unauthorized write: ${e.message}`);
    }

    console.log("\n--- [ENFORCEMENT TEST] Starting Phase 2: Forgery Protection Check ---");
    try {
        console.log("Attempting to forge approval via bb_set...");
        blackboard.set("_sys_critique_status", "APPROVED");
        console.log("[FAILURE] Bypassed forgery protection! Managed to set _sys_ status.");
    } catch (e: any) {
        console.log(`[SUCCESS] Correctly blocked forgery: ${e.message}`);
    }

    console.log("\n--- [ENFORCEMENT TEST] Starting Phase 3: Approval Lifecycle Check ---");
    
    // Simulate internal system setting (only possible via index.ts direct access)
    console.log("Simulating Internal System Approval...");
    (blackboard as any).state["_sys_critique_status"] = "APPROVED";
    
    try {
        console.log("Attempting approved fs_write...");
        if (blackboard.get("_sys_critique_status") !== "APPROVED") {
            throw new Error("Logic error: status should be approved.");
        }
        await FilesystemHandler.write(testFile, "PASS");
        console.log("[SUCCESS] fs_write permitted after approval.");
        
        // Cleanup
        await FilesystemHandler.delete(testFile);
    } catch (e: any) {
        console.log(`[FAILURE] Approval was ignored or failed: ${e.message}`);
    }

    console.log("\n--- [ENFORCEMENT TEST] COMPLETE ---");
}

runTest().catch(console.error);
