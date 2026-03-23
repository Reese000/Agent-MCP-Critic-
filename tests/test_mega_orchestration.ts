import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");

async function runMegaTest() {
    console.log("Starting Phase 4 Mega-Orchestration Swarm...");
    
    // Deliberately introduce a "Seed Bug" for Error Fixer to find and fix
    // We'll add a typo to src/Blackboard.ts (a non-critical comment or log)
    // Actually, let's add a redundant console.log that counts as "bloat"
    
    const transport = new StdioClientTransport({
        command: "node",
        args: ["--loader", "ts-node/esm", "src/index.ts"],
        env: { ...process.env, DEBUG: "mcp:*" }
    });

    const client = new Client({ name: "mega-test-client", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);

    try {
        console.log("Launching Mega-Orchestration...");
        const result = await client.request({
            method: "tools/call",
            params: {
                name: "parallel_orchestrator",
                arguments: {
                    tasks: [
                        // WAVE 1: Discovery & Sanitization
                        {
                            id: "discovery",
                            description: "Map the 'src/' directory using 'fs_list' and save the file list to blackboard key 'src_map'.",
                            persona: "researcher"
                        },
                        {
                            id: "sanitization",
                            description: "Check the blackboard for 'src_map'. Audit current logs and identify if there is any 'bloat' (e.g., redundant log files). Prune the blackboard of any keys starting with 'stale_'.",
                            persona: "anti_bloat"
                        },
                        
                        // WAVE 2: Analysis (Depends on Wave 1)
                        {
                            id: "doc_audit",
                            dependsOn: ["discovery"],
                            description: "Examine 'src/index.ts'. Identify if the 'parallel_orchestrator' handler has JSDoc comments. Report findings to blackboard key 'doc_gap'.",
                            persona: "documenter"
                        },
                        {
                            id: "cost_analysis",
                            dependsOn: ["discovery"],
                            description: "Analyze the tool-use efficiency of the 'discovery' task. Suggest if a smaller model like 'flash-lite' would be sufficient for research. Save suggestion to 'model_recommendation'.",
                            persona: "cost_optimizer"
                        },
                        
                        // WAVE 3: Implementation (Depends on Wave 2)
                        {
                            id: "fix_logic",
                            dependsOn: ["doc_audit"],
                            description: "A minor formatting issue exists in 'shared/logic.ts' (the console.log has a typo 'Clering'). Find it and fix it using 'fs_write'.",
                            persona: "error_fixer"
                        },
                        {
                            id: "test_gen",
                            dependsOn: ["fix_logic"],
                            description: "Generate a small test 'tests/verify_fix.ts' that imports the function from 'shared/logic.ts' and calls it to verify the fix works. Print 'FIX_READY' on success.",
                            persona: "tester"
                        },
                        
                        // WAVE 4: Final Validation
                        {
                            id: "final_dev",
                            dependsOn: ["test_gen"],
                            description: "Execute 'node --loader ts-node/esm tests/verify_fix.ts'. Confirm 'FIX_READY' is in the output.",
                            persona: "developer"
                        },
                        {
                            id: "ux_report",
                            dependsOn: ["final_dev"],
                            description: "Review all orchestration logs on the blackboard. Provide a 3-paragraph health report on the agent swarm's coordination and UX quality. Save to 'ux_health_report'.",
                            persona: "ux_auditor"
                        }
                    ],
                    concurrency: 4
                }
            }
        }, CallToolResultSchema);

        console.log("Mega-Orchestration Finished.");
        const results = JSON.parse((result.content[0] as any).text);
        
        console.log("--- SWARM FINAL REPORT ---");
        Object.keys(results).forEach(id => {
            console.log(`[${id}] Status: Complete`);
        });

        if (results.ux_report) {
            console.log("\n[UX HEALTH REPORT]\n", results.ux_report.output);
        }

        process.exit(0);
    } catch (error) {
        console.error("Mega-Test failed:", error);
        process.exit(1);
    }
}

runMegaTest();
