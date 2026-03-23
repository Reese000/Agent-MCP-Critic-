import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AICAM_ROOT = "c:\\Users\\reese\\OneDrive\\Desktop\\AI\\AI CAM 2.0";

async function runAudit() {
    console.log("Starting AI CAM 2.0 Swarm Audit...");
    
    const transport = new StdioClientTransport({
        command: "node",
        args: ["--loader", "ts-node/esm", "src/index.ts"],
        env: { ...process.env, DEBUG: "mcp:*" }
    });

    const client = new Client({ name: "aicam-audit-client", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);

    try {
        const result = await client.request({
            method: "tools/call",
            params: {
                name: "parallel_orchestrator",
                arguments: {
                    tasks: [
                        // WAVE 1: Discovery
                        {
                            id: "map_engine",
                            description: `Map the engine directory: ${path.join(AICAM_ROOT, "engine")}. List the files in 'simulator'.`,
                            persona: "researcher"
                        },
                        {
                            id: "audit_docs",
                            description: `Read the executive summary of ${path.join(AICAM_ROOT, "ALL_PROBLEMS_AUDIT.md")}. Identify the 'High Priority' simulator issues.`,
                            persona: "documenter"
                        },
                        
                        // WAVE 2: Transparency & Verification
                        {
                            id: "transparency",
                            dependsOn: ["map_engine", "audit_docs"],
                            description: "Use the 'bb_list' tool to review all discoveries made by the Researcher and Documenter. Provide a summary of the captured thoughts.",
                            persona: "ux_auditor"
                        },
                        {
                            id: "target_fix_research",
                            dependsOn: ["map_engine", "audit_docs"],
                            description: `Locate 'gcode_parser.py' in the simulator and verify if line 12 is still a hard-coded default RPM.`,
                            persona: "error_fixer"
                        }
                    ],
                    concurrency: 2
                }
            }
        }, CallToolResultSchema);

        console.log("AI CAM 2.0 Audit Swarm Finished.");
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Audit failed:", error);
        process.exit(1);
    }
}

runAudit();
