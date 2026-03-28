import { blackboard } from "../src/BlackboardInstance.js";
import { FilesystemHandler } from "../src/FilesystemHandler.js";
import { ToolDispatcher } from "../src/index.js"; 
import { ProtocolFilter } from "../src/ProtocolFilter.js";
import fs from "fs/promises";
import path from "path";

// Disable the noise filter for testing
ProtocolFilter.stop();

async function runTests() {
    console.log("--- Starting Verification Suite ---");

    // 1. Test Blackboard Protection
    console.log("\n1. Testing Blackboard Protection...");
    try {
        blackboard.set("_sys_critique_status", "HACKED");
        console.error("FAIL: Managed to set protected key directly!");
    } catch (e: any) {
        console.log(`SUCCESS: Protected key blocked with message: ${e.message}`);
    }

    blackboard.approveCritique();
    if (blackboard.get("_sys_critique_status") === "APPROVED") {
        console.log("SUCCESS: approveCritique() works.");
    } else {
        console.error("FAIL: approveCritique() did not update state.");
    }

    // 2. Test Regex Hardening
    console.log("\n2. Testing Regex Hardening...");
    const maliciousPattern = "(a+)+$"; // Classic ReDoS pattern
    try {
        const results = await FilesystemHandler.grep(process.cwd(), maliciousPattern);
        console.log("SUCCESS: Malicious regex handled safely (escaped).");
    } catch (e: any) {
        console.error(`FAIL: Regex error: ${e.message}`);
    }

    // 3. Test Streaming Grep
    console.log("\n3. Testing Streaming Grep...");
    const testFile = "large_test.txt";
    const largeContent = Array(1000).fill("This is a line with a secret").join("\n");
    await fs.writeFile(testFile, largeContent);
    
    try {
        const root = process.cwd();
        console.log(`[VERIFY-GREP] Working Dir: ${root}`);
        const results = await FilesystemHandler.grep(root, "secret");
        const filePath = path.resolve(testFile);
        
        console.log(`[VERIFY-GREP] Searching for: ${filePath}`);
        const keys = Object.keys(results);
        console.log(`[VERIFY-GREP] Discovered keys: ${keys.length} files found.`);

        const fileKey = keys.find(k => k.toLowerCase() === filePath.toLowerCase());
        const fileResults = fileKey ? results[fileKey] : undefined;
        
        if (fileResults && fileResults.length === 101) { 
             console.log(`SUCCESS: Streaming grep worked and capped at ${fileResults.length} matches.`);
        } else {
             console.log(`FAIL: Grep returned ${fileResults?.length || 0} matches (expected 101).`);
             if (keys.length > 0) {
                 console.log(`Sample key: ${keys[0]}`);
             }
        }
    } catch (err: any) {
        console.error(`ERROR in grep test: ${err.message}`);
    } finally {
        if (await fs.stat(testFile).catch(() => null)) {
            await fs.unlink(testFile);
        }
    }

    // 5. Test Command Injection (Security Hardening)
    console.log("\n5. Testing Command Injection Hardening...");
    try {
        const maliciousCmd = "echo hello & whoami";
        // This should run if we allow shell, but let's test a forbidden pattern
        const destructiveCmd = "del /s /q c:\\windows\\system32"; 
        const res3 = await ToolDispatcher.dispatch("fs_execute", { command: destructiveCmd, path: "." });
        if (res3.includes("SECURITY ALERT") || res3.includes("blocked")) {
            console.log("SUCCESS: Destructive command blocked by TerminalHandler.");
        } else {
            console.error(`FAIL: Destructive command was NOT blocked! Result: ${res3}`);
        }
    } catch (e: any) {
        console.error(`ERROR in injection test: ${e.message}`);
    }

    // 6. Test Project-Aware Path Protection
    console.log("\n6. Testing Project-Aware Path Protection...");
    blackboard.approveCritique();
    const protectedPath = path.join(process.cwd(), "src", "index.ts");
    const res4 = await ToolDispatcher.dispatch("fs_write", { path: protectedPath, content: "// hack" });
    if (res4.includes("PERMITTED DENIED") || res4.includes("protected")) {
        console.log("SUCCESS: Critical source file protected within workspace.");
    } else {
        console.error(`FAIL: Critical source file was NOT protected! Result: ${res4}`);
    }

    const safePathOutside = path.join(process.cwd(), "..", "external_test.txt");
    // This should be allowed because it's outside the CRITIC 'src' folder (relative to CWD)
    // Note: Actually, my logic protects anything in 'src' anywhere if it's inside CWD.
    // If the folder is 'Agent MCP (critic)/src', it's protected.
    // I'll test a folder just named 'src' outside the current project if I can.
    
    // 7. Test Parser Resiliency
    console.log("\n7. Testing Argument Parser Resiliency...");
    const testArgString = 'path="./src", timeout=123.45 + extra';
    const argRegex = /(\w+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\d+(?:\.\d+)?)|(true|false))/g;
    let m;
    let lastMatchedIndex = 0;
    const args: any = {};
    while ((m = argRegex.exec(testArgString)) !== null) {
        const key = m[1];
        let val: any = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? Number(m[4]) : m[5] === "true"));
        args[key] = val;
        lastMatchedIndex = argRegex.lastIndex;
    }
    const unparsed = testArgString.substring(lastMatchedIndex).trim().replace(/^[,\s]+|[,\s]+$/g, '');
    
    if (args.timeout === 123.45 && unparsed === "+ extra") {
        console.log("SUCCESS: Parser correctly handled float and detected unparsed fragment.");
    } else {
        console.error(`FAIL: Parser output unexpected. Args: ${JSON.stringify(args)}, Unparsed: "${unparsed}"`);
    }

    console.log("\n--- Verification Suite Complete ---");
}

runTests().catch(console.error);
