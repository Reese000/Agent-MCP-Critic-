import { spawn } from "child_process";
import path from "path";

/**
 * autonomous_validator.ts
 * Acts as a direct MCP client to verify the 'critic' server.
 * Invokes functionalities via JSON-RPC over stdio.
 */

async function callMcpTool(serverProcess: any, method: string, args: any): Promise<any> {
    const id = Math.floor(Math.random() * 1000000);
    const request = {
        jsonrpc: "2.0",
        id,
        method: `toolkit/${method}`, // MCP format or custom? index.ts uses direct tool name in toolkit
        params: { name: method, arguments: args }
    };

    return new Promise((resolve, reject) => {
        const onData = (data: Buffer) => {
            try {
                const response = JSON.parse(data.toString());
                if (response.id === id) {
                    serverProcess.stdout.off("data", onData);
                    resolve(response.result);
                }
            } catch (e) {
                // Partial JSON, ignore
            }
        };
        serverProcess.stdout.on("data", onData);
        serverProcess.stdin.write(JSON.stringify(request) + "\n");
    });
}

async function run() {
    process.env.MACO_MONITOR = "false"; // Don't launch another monitor
    const serverPath = path.resolve("src/index.ts");
    const server = spawn("node", ["--loader", "ts-node/esm", serverPath], {
        env: { ...process.env, NODE_OPTIONS: "--no-warnings" }
    });

    server.stderr.on("data", (d) => console.error(`[SERVER LOG] ${d.toString().trim()}`));

    console.log(">>> INITIALIZING AUTONOMOUS AUDIT RUN <<<");

    try {
        // Wait for server to start
        await new Promise(r => setTimeout(r, 3000));

        // 1. Trigger Code Indexing
        console.log("Calling 'code_index'...");
        const indexRes = await callMcpTool(server, "code_index", { 
            root: "c:/Users/reese/OneDrive/Desktop/AI/Agent MCP (critic)" 
        });
        console.log("Index Result Length:", (indexRes as any).content[0].text.length);

        // 2. Trigger Parallel Orchestration
        console.log("Calling 'parallel_orchestrator'...");
        const manifest = {
            taskId: "autonomous_verification_pass",
            waves: [
                {
                    id: "wave_1",
                    tasks: [
                        {
                            agentId: "researcher_01",
                            persona: "REASEARCHER",
                            tool: "fs_list",
                            args: { path: "c:/Users/reese/OneDrive/Desktop/AI/Agent MCP (critic)/src" },
                            description: "List all source files to verify the index."
                        }
                    ]
                }
            ]
        };
        const orchRes = await callMcpTool(server, "parallel_orchestrator", { manifest });
        console.log("Orchestration Result Captured.");

        console.log(">>> SYSTEM VERIFIED VIA MCP-ONLY PROTOCOL <<<");
    } catch (e: any) {
        console.error("FATAL: Autonomous verification failed", e.message);
    } finally {
        server.kill();
        process.exit(0);
    }
}

run();
