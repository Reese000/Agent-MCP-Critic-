import { ProtocolFilter } from "../src/ProtocolFilter.js";
import { telemetry } from "../src/Telemetry.js";

/**
 * tests/test_protocol_security.ts
 * Audits the ProtocolFilter for security bypasses and protocol corruption risks.
 */

async function runSecurityAudit() {
    console.log("=== [SECURITY AUDIT: PROTOCOL FILTER] ===");

    let stdoutData = "";
    let stderrData = "";

    const mockStdout = {
        write: (chunk: any) => {
            stdoutData += chunk.toString();
            return true;
        }
    };

    const mockStderr = {
        write: (chunk: any) => {
            stderrData += chunk.toString();
            return true;
        }
    };

    ProtocolFilter.setTargets(mockStdout, mockStderr);
    ProtocolFilter.start();

    // Use real stderr for test status reporting to avoid being hijacked
    const log = (msg: string) => process.stderr.write(msg + "\n");

    log("\n[TEST 1] Valid JSON-RPC Routing...");
    const validRpc = '{"jsonrpc": "2.0", "result": "ok", "id": 1}';
    process.stdout.write(validRpc);
    if (stdoutData.includes(validRpc)) {
        log("SUCCESS: Valid RPC routed to stdout.");
    } else {
        log("FAILURE: Valid RPC suppressed.");
    }

    // Reset buffers
    stdoutData = "";
    stderrData = "";

    // 2. Security Bypass: Malicious Log (Should go to stderr)
    log("\n[TEST 2] Protocol Corruption Bypass (Malicious Log)...");
    const maliciousLog = '{ "jsonrpc": "2.0", "note": "I am just a log but I look like RPC" }';
    process.stdout.write(maliciousLog);
    
    if (stdoutData.includes(maliciousLog)) {
        log("CRITICAL VULNERABILITY: Malicious log bypassed filter and reached stdout!");
    } else if (stderrData.includes(maliciousLog)) {
        log("SUCCESS: Malicious log correctly diverted to stderr (Hardening Verified).");
    }

    ProtocolFilter.stop();
    log("\n=== [SECURITY AUDIT COMPLETE] ===");
    
    // Check if we captured the success
    if (stderrData.includes(maliciousLog) && stdoutData.includes(validRpc) === false) {
        process.exit(0); 
    } else {
        process.exit(1);
    }
}

runSecurityAudit().catch(console.error);
