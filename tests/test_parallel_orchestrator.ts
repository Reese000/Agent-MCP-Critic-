import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Since we can't easily run the full server in a test script without stdio redirection,
// we will mock a request to the server if it were running, 
// or better yet, just test the handler logic by importing it if it were exported.
// However, index.ts doesn't export the handler.
// So, I will create a script that uses 'node dist/index.js' and communicates via stdio.

import { spawn } from "child_process";

async function testOrchestrator() {
    console.log("Starting Parallel Orchestrator Test...");

    const child = spawn("node", ["dist/index.js"], {
        env: process.env,
        stdio: ["pipe", "pipe", "inherit"]
    });

    const sendRequest = (req: any) => {
        child.stdin.write(JSON.stringify(req) + "\n");
    };

    child.stdout.on("data", (data) => {
        const response = data.toString();
        try {
            const parsed = JSON.parse(response);
            if (parsed.method === "notifications/initialized") return;
            console.log("Received Response:", JSON.stringify(parsed, null, 2));
            child.kill();
        } catch (e) {
            // Ignore non-json or noise
        }
    });

    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    const testRequest = {
        jsonrpc: "2.0",
        id: "1",
        method: "tools/call",
        params: {
            name: "parallel_orchestrator",
            arguments: {
                tasks: [
                    {
                        id: "math_task",
                        description: "What is 15 * 12? Explain the steps.",
                        persona: "expert_developer"
                    },
                    {
                        id: "logic_task",
                        description: "If all bloops are bleeps and some bleeps are blops, are all bloops blops? Explain.",
                        persona: "research_analyst"
                    }
                ],
                optimization_rounds: 1,
                concurrency: 2
            }
        }
    };

    console.log("Sending parallel_orchestrator request...");
    sendRequest(testRequest);
}

testOrchestrator().catch(console.error);
