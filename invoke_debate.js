import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPath = path.join(__dirname, 'dist', 'index.js');
console.log(`Starting Critic Server at ${serverPath}`);

const serverProcess = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'inherit']
});

const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
        name: "agent_debate",
        arguments: {
            topic: "Tabs vs Spaces for indentation",
            position_a: "Tabs are universally better because they allow developers to set their own visual width preferences without changing the file size. They are perfectly semantic.",
            position_b: "Spaces are universally better because they guarantee the exact same visual alignment across every single editor and terminal environment, eliminating cross-platform formatting issues.",
            max_turns: 1,
            model: "meta-llama/llama-3.3-70b-instruct"
        }
    }
};

let buffer = '';

serverProcess.stdout.on('data', (data) => {
    buffer += data.toString();
    console.log(`[RAW STDOUT]: ${data.toString()}`);
    
    try {
        const response = JSON.parse(buffer);
        console.log('\n=============================================');
        console.log('[PARSED RESPONSE START]');
        console.log(response.result?.content?.[0]?.text);
        console.log('[PARSED RESPONSE END]');
        console.log('=============================================\n');
        
        console.log('Debate successful. Exiting.');
        serverProcess.kill();
        process.exit(0);
    } catch (e) {
        // Still waiting for full JSON payload
    }
});

serverProcess.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
});

serverProcess.on('error', (err) => {
    console.error(`Failed to start subprocess: ${err}`);
});

setTimeout(() => {
    const message = JSON.stringify(payload) + '\n';
    console.log(`Sending Payload: ${message}`);
    serverProcess.stdin.write(message);
}, 1000);

// Failsafe timeout
setTimeout(() => {
    console.error('Timeout reached. Killing process.');
    serverProcess.kill();
    process.exit(1);
}, 30000);
