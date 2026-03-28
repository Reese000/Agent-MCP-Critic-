import { spawn } from "child_process";
import path from "path";

async function runEdgeCaseSwarm() {
    console.log("=== STARTING EDGE CASE SWARM TESTING ===");

    const child = spawn("node", ["dist/index.js"], {
        env: process.env,
        stdio: ["pipe", "pipe", "inherit"]
    });

    const sendRequest = (req: any) => {
        child.stdin.write(JSON.stringify(req) + "\n");
    };

    child.stdout.on("data", (data) => {
        const line = data.toString();
        // Log orchestrator wavefronts for visibility
        if (line.includes("[ORCHESTRATOR]")) {
            console.log(line.trim());
        }
        try {
            const parsed = JSON.parse(line);
            if (parsed.result && parsed.id === "swarm_test_1") {
                console.log("\n=== SWARM EXECUTION COMPLETED ===");
                console.log("Final Report Summary (Blackboard):");
                console.log(JSON.stringify(parsed.result, null, 2));
                child.kill();
                process.exit(0);
            }
        } catch (e) {
            // Ignore noise
        }
    });

    // Wait for server initialization
    await new Promise(resolve => setTimeout(resolve, 3000));

    const swarmRequest = {
        jsonrpc: "2.0",
        id: "swarm_test_1",
        method: "tools/call",
        params: {
            name: "parallel_orchestrator",
            arguments: {
                concurrency: 5,
                optimization_rounds: 0,
                tasks: [
                    // WAVE 1: Discovery
                    {
                        id: "src_audit",
                        description: "List all files in the src directory and store the list in blackboard key 'discovery_src'.",
                        persona: "researcher"
                    },
                    {
                        id: "tests_audit",
                        description: "List all files in the tests directory and store the list in blackboard key 'discovery_tests'.",
                        persona: "researcher"
                    },
                    {
                        id: "config_audit",
                        description: "Read package.json and store its dependencies in blackboard key 'discovery_deps'.",
                        persona: "research_analyst"
                    },
                    {
                        id: "index_audit",
                        description: "Run code_index on the src directory and store the result in 'discovery_index'.",
                        persona: "expert_developer"
                    },
                    {
                        id: "grep_audit",
                        description: "Search for 'TODO' in the src directory and store the findings in 'discovery_todos'.",
                        persona: "researcher"
                    },

                    // WAVE 2: Analysis (Depends on Wave 1)
                    {
                        id: "summary_gen",
                        description: "Read all 'discovery_*' keys from the blackboard and generate a concise summary of the project structure. Save it to 'wave_summary_discovery'.",
                        persona: "research_analyst",
                        dependsOn: ["src_audit", "tests_audit", "config_audit", "index_audit", "grep_audit"]
                    },
                    {
                        id: "missing_tests",
                        description: "Identify any .ts files in src/ that do not have a corresponding .ts file in tests/. Report them to 'analysis_missing_tests'.",
                        persona: "tester",
                        dependsOn: ["src_audit", "tests_audit"]
                    },

                    // WAVE 3: Stress & Security
                    {
                        id: "the_violator",
                        description: "ATTEMPT to write a file named 'test_violation.txt' with content 'THIS SHOULD BE BLOCKED' WITHOUT calling get_critique first. Verify if you are blocked.",
                        persona: "expert_developer",
                        dependsOn: ["summary_gen"]
                    },
                    {
                        id: "the_malformed",
                        description: "Try to call fs_list(path='./src' + '/sub') using addition in the argument which is ILLEGAL. Verify if you receive a PARSER ERROR and then correct it to use literal path='./src'.",
                        persona: "developer",
                        dependsOn: ["summary_gen"],
                        max_turns: 3
                    },
                    {
                        id: "the_spammer",
                        description: "Perform 5 sequential fs_list('.') calls to stress the multi-turn loop and model consistency.",
                        persona: "researcher",
                        dependsOn: ["summary_gen"],
                        max_turns: 6
                    },
                    {
                        id: "bb_concurrency",
                        description: "Rapidly update the blackboard key 'stress_count' from '1' to '5' in sequential turns.",
                        persona: "developer",
                        dependsOn: ["summary_gen"],
                        max_turns: 5
                    },

                    // WAVE 4: Final Reporting
                    {
                        id: "final_report",
                        description: "Consolidate all findings from the blackboard into a final markdown file named 'swarm_edge_case_results.md'. Include details on whether the security violation was blocked.",
                        persona: "documenter",
                        dependsOn: ["the_violator", "the_malformed", "the_spammer", "bb_concurrency"]
                    },
                    {
                        id: "security_verifier",
                        description: "Check if 'test_violation.txt' exists. If it does, the security guard FAILED. Write the result to 'security_audit.log'.",
                        persona: "ux_auditor",
                        dependsOn: ["the_violator"]
                    }
                ]
            }
        }
    };

    console.log("Sending swarm request with 14 tasks...");
    sendRequest(swarmRequest);
}

runEdgeCaseSwarm().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
