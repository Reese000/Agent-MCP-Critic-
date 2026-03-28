import { spawn } from "child_process";

async function runUXAuditorSwarm() {
    console.log("=== STARTING UX AUDITOR SWARM SIMULATION ===");

    const child = spawn("node", ["dist/index.js"], {
        env: process.env,
        stdio: ["pipe", "pipe", "inherit"]
    });

    const sendRequest = (req: any) => {
        child.stdin.write(JSON.stringify(req) + "\n");
    };

    child.stdout.on("data", (data) => {
        const line = data.toString();
        if (line.includes("[ORCHESTRATOR]")) {
            console.log(line.trim());
        }
        try {
            const parsed = JSON.parse(line);
            if (parsed.result && parsed.id === "ux_audit_1") {
                console.log("\n=== UX AUDIT SWARM COMPLETED ===");
                child.kill();
                process.exit(0);
            }
        } catch (e) {
            // Noise
        }
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    const swarmRequest = {
        jsonrpc: "2.0",
        id: "ux_audit_1",
        method: "tools/call",
        params: {
            name: "parallel_orchestrator",
            arguments: {
                concurrency: 4,
                tasks: [
                    // WAVE 1: Persona Audits
                    {
                        id: "newbie_auditor",
                        description: "Attempt to explore the codebase using only 'fs_list' and 'fs_read'. Store your findings on 'audit_newbie'. Highlight any confusing tool responses or missing instruction clarity.",
                        persona: "ux_auditor"
                    },
                    {
                        id: "power_user_auditor",
                        description: "Simulate planning a massive refactor (e.g., modularizing the 'src/' folder). Call multiple tools and report on tool-use overhead and orchestration friction on 'audit_power'.",
                        persona: "developer"
                    },
                    {
                        id: "skeptic_auditor",
                        description: "Attempt prohibited actions like writing to 'node_modules' or reading '.env' without approval. Evaluate if the denial messages are informative and if you feel 'guided' to the right protocol. Store findings on 'audit_skeptic'.",
                        persona: "ux_auditor"
                    },
                    {
                        id: "ergonomist_auditor",
                        description: "Audit the visual format of tool outputs (JSON vs Text). Is there too much noise? Suggest improvements for CLI-style readability on 'audit_ergonomist'.",
                        persona: "ux_auditor"
                    },

                    // WAVE 2: Consolidation
                    {
                        id: "meta_auditor",
                        description: "Read all 'audit_*' keys from the blackboard and create a comprehensive 'UX_FRICTION_REPORT.md' file. Be brutally honest about project friction.",
                        persona: "meta_optimizer",
                        dependsOn: ["newbie_auditor", "power_user_auditor", "skeptic_auditor", "ergonomist_auditor"]
                    },

                    // WAVE 3: Automated Improvement
                    {
                        id: "the_architect",
                        description: "Read 'UX_FRICTION_REPORT.md' and implement at least 3 direct code changes to 'src/index.ts' or 'src/FilesystemHandler.ts' to address the reported friction. Focus on improving error messages or tool-use hints.",
                        persona: "expert_developer",
                        dependsOn: ["meta_auditor"]
                    }
                ]
            }
        }
    };

    console.log("Launching UX Auditor Swarm (6 tasks)...");
    sendRequest(swarmRequest);
}

runUXAuditorSwarm().catch(err => {
    console.error("UX Audit failed:", err);
    process.exit(1);
});
