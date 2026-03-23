import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

async function runTest() {
    console.log("Starting Autonomous Execution Test...");
    
    const transport = new StdioClientTransport({
        command: "node",
        args: ["--loader", "ts-node/esm", "src/index.ts"],
        env: { ...process.env, DEBUG: "mcp:*" }
    });

    const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);

    try {
        console.log("Sending Autonomous Execution Task...");
        const result = await client.request({
            method: "tools/call",
            params: {
                name: "parallel_orchestrator",
                arguments: {
                    tasks: [{
                        id: "exec_task",
                        description: "Create a simple text file 'hello.txt' containing 'AGENT_RUN_SUCCESS', then execute 'type hello.txt' (on Windows) or 'cat hello.txt' (on Linux/Mac) to read it back and report the output precisely.",
                        persona: "developer",
                        max_turns: 5
                    }]
                }
            }
        }, CallToolRequestSchema);

        console.log("Result Output:", JSON.stringify(result, null, 2));
        
        const outputStr = JSON.stringify(result);
        if (outputStr.includes("AGENT_RUN_SUCCESS")) {
            console.log("PASSED: Autonomous Execution Successful!");
            process.exit(0);
        } else {
            console.error("FAILED: Could not find sentinel string in agent output.");
            process.exit(1);
        }

    } catch (error) {
        console.error("Test execution failed:", error);
        process.exit(1);
    }
}

runTest();
