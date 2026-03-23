import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runExhaustiveComplianceTest() {
    console.log("=== BEGIN EXHAUSTIVE COMPLIANCE TEST (V1.6.0) ===");

    const serverPath = path.join(__dirname, '..', 'dist', 'index.js');
    console.log(`Target Server: ${serverPath}`);

    // Use a unique indicator to verify diagnostic redirection
    const server = spawn('node', [serverPath], {
        env: { ...process.env, OPENROUTER_API_KEY: 'test-key' }
    });

    let stdoutChunks: string[] = [];
    let stderrChunks: string[] = [];

    server.stdout.on('data', (data) => {
        const chunk = data.toString();
        stdoutChunks.push(chunk);
        console.log(`[STDOUT RECEIVE] ${chunk.length} bytes: ${chunk.replace(/\n/g, '\\n')}`);
    });

    server.stderr.on('data', (data) => {
        const chunk = data.toString();
        stderrChunks.push(chunk);
        console.log(`[STDERR RECEIVE] ${chunk.length} bytes: ${chunk.replace(/\n/g, '\\n')}`);
    });

    // Sequence of challenging test cases citing JSON-RPC 2.0 and MCP spec
    const testCases = [
        { name: "Initial Noise (dotenv style)", content: "Some diagnostic noise from a library\n" },
        { name: "Non-Protocol JSON", content: '{"status": "ok", "message": "not a json-rpc message"}\n' },
        { name: "Valid Protocol (Request)", content: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "1" } } }) + "\n" },
        { name: "Malformed JSON", content: '{"jsonrpc": "2.0", [this is broken]\n' },
        { name: "Valid Notification (Indented)", content: "   " + JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n" },
        { name: "Large Buffer Junk", content: "X".repeat(512) + "\n" }
    ];

    for (const testCase of testCases) {
        console.log(`[TEST SEND] ${testCase.name}`);
        server.stdin.write(testCase.content);
        // Delay to allow processing
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Allow final processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    server.kill();

    console.log("\n=== FINAL AUDIT ===");

    console.log("Check 1: Stdout Integrity (Strict Protocol Only)");
    const stdoutData = stdoutChunks.join('');
    const stdoutLines = stdoutData.trim().split('\n').filter(l => l.length > 0);

    console.log(`Total Stdout Lines: ${stdoutLines.length}`);
    let stdoutClean = true;
    for (const line of stdoutLines) {
        console.log(`  Auditing: ${line.substring(0, 60)}...`);
        try {
            const json = JSON.parse(line);
            if (json.jsonrpc === "2.0") {
                console.log("    [PASS] Valid JSON-RPC 2.0 object found.");
            } else {
                console.error("    [FAIL] Line is JSON but lacks correct jsonrpc version key.");
                stdoutClean = false;
            }
        } catch (e) {
            console.error("    [FAIL] Line is NOT valid JSON. Protocol corrupted.");
            stdoutClean = false;
        }
    }

    console.log("\nCheck 2: Stderr Redirection (All noise diverted)");
    const stderrData = stderrChunks.join('');
    console.log(`Total Stderr Size: ${stderrData.length} bytes`);

    // Verify specific indicators of success
    const foundDotenv = stderrData.includes('[dotenv');
    const foundRedirectionFlag = stderrData.includes('[ProtocolFilter] Diverted noise');

    if (foundDotenv) console.log("  [PASS] Found early-init dotenv noise in stderr.");
    if (foundRedirectionFlag) console.log("  [PASS] Found ProtocolFilter redirection logs in stderr.");

    if (stdoutClean && foundRedirectionFlag) {
        console.log("\n=== COMPLIANCE RESULT: SUCCESS ===");
        process.exit(0);
    } else {
        console.error("\n=== COMPLIANCE RESULT: FAILURE ===");
        process.exit(1);
    }
}

runExhaustiveComplianceTest().catch(err => {
    console.error("FATAL TEST ERROR:", err);
    process.exit(1);
});
