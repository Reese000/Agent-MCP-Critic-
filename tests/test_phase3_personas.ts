import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

async function runTest() {
    console.log("Starting Phase 3 Persona Verification...");
    
    const transport = new StdioClientTransport({
        command: "node",
        args: ["--loader", "ts-node/esm", "src/index.ts"],
        env: { ...process.env, DEBUG: "mcp:*" }
    });

    const client = new Client({ name: "test-client", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);

    try {
        console.log("Executing Specialized Agent Chain...");
        const result = await client.request({
            method: "tools/call",
            params: {
                name: "parallel_orchestrator",
                arguments: {
                    tasks: [
                        {
                            id: "research_phase",
                            description: "Use fs_read to examine 'src/FilesystemHandler.ts'. Find the exact signature of the 'grep' method and save it to the blackboard key 'grep_spec'.",
                            persona: "researcher"
                        },
                        {
                            id: "test_gen_phase",
                            dependsOn: ["research_phase"],
                            description: "Read 'grep_spec' from the blackboard. Create a standalone test file 'tests/verify_grep_logic.ts' that uses the FilesystemHandler's grep method to find the word 'import' in 'src/index.ts'. Ensure the test prints 'GREP_VERIFIED' on success.",
                            persona: "tester"
                        },
                        {
                            id: "exec_phase",
                            dependsOn: ["test_gen_phase"],
                            description: "Execute 'npx ts-node tests/verify_grep_logic.ts' in the root directory. Capture the output and verify if 'GREP_VERIFIED' is present.",
                            persona: "developer"
                        }
                    ]
                }
            }
        }, CallToolResultSchema);

        console.log("Orchestration Finished.");
        const output = JSON.stringify(result);
        
        if (output.includes("GREP_VERIFIED")) {
            console.log("PASSED: Specialized Agent Chain Successful!");
            process.exit(0);
        } else {
            console.error("FAILED: Could not find 'GREP_VERIFIED' in final output.");
            console.log("Check logs/debug output for details.");
            process.exit(1);
        }

    } catch (error) {
        console.error("Test execution failed:", error);
        process.exit(1);
    }
}

runTest();
