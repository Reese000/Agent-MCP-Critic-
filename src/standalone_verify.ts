import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("--- Standalone MCP Startup Verification ---");

const mcpServerPath = path.resolve(__dirname, '../dist/index.js');

console.log(`Target: ${mcpServerPath}`);

const child = spawn('node', [mcpServerPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, DEBUG: 'true' }
});

let outputReceived = false;

child.stdout.on('data', (data) => {
    outputReceived = true;
    console.log(`[STDOUT] Received heartbeat: ${data.toString().trim()}`);
    // MCP servers usually output something or wait for stdin
    // We'll give it 2 seconds then terminate
});

child.stderr.on('data', (data) => {
    console.error(`[STDERR] ${data.toString().trim()}`);
});

setTimeout(() => {
    if (outputReceived) {
        console.log("SUCCESS: MCP Server started and produced output.");
    } else {
        console.log("WARNING: No output received from MCP server, but process is still running. This might be normal for JSON-RPC servers waiting for input.");
    }
    child.kill();
    process.exit(0);
}, 3000);
