import { spawn } from "child_process";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

async function runTest() {
    console.log("Starting Phase 2 Coordination Test...");
    
    const transport = new StdioClientTransport({
        command: "node",
        args: ["--loader", "ts-node/esm", "src/index.ts"],
        env: { ...process.env, DEBUG: "mcp:*" }
    });

    const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);

    const testTasks = [
        {
            id: "task_a",
            description: "Set the key 'phase' to 'Alpha' on the shared blackboard and write 'Phase Alpha Init' to a file named 'alpha.txt' in the current directory.",
            persona: "developer"
        },
        {
            id: "task_b",
            dependsOn: ["task_a"],
            description: "Read the key 'phase' from the blackboard. Append ' -> Beta' to it and save this new string to the blackboard key 'phase_updated'. Also write the result to 'beta.txt'.",
            persona: "analyst"
        },
        {
            id: "task_c",
            dependsOn: ["task_b"],
            description: "Fetch 'phase_updated' from the blackboard and write it to a file named 'final_phase.txt'.",
            persona: "manager"
        }
    ];

    try {
        console.log("Sending Orchestration Request...");
        const result = await client.request({
            method: "tools/call",
            params: {
                name: "parallel_orchestrator",
                arguments: {
                    tasks: testTasks,
                    concurrency: 2
                }
            }
        }, CallToolRequestSchema);

        console.log("Orchestration Result:", JSON.stringify(result, null, 2));

        // Verification
        const alpha = await fs.readFile(path.join(ROOT_DIR, "alpha.txt"), "utf-8");
        const beta = await fs.readFile(path.join(ROOT_DIR, "beta.txt"), "utf-8");
        const final = await fs.readFile(path.join(ROOT_DIR, "final_phase.txt"), "utf-8");

        console.log(`Alpha File: ${alpha}`);
        console.log(`Beta File: ${beta}`);
        console.log(`Final File: ${final}`);

        if (final.trim() === "Alpha -> Beta") {
            console.log("PASSED: Phase 2 Coordination Successful!");
            process.exit(0);
        } else {
            console.error(`FAILED: Unexpected final output: ${final}`);
            process.exit(1);
        }

    } catch (error) {
        console.error("Test execution failed:", error);
        process.exit(1);
    }
}

runTest();
