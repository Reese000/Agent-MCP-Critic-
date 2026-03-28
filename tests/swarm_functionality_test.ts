import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const REPORT_FILE = path.join(ROOT_DIR, "swarm_test_report.md");

async function runTest() {
    console.log("Starting Critic Swarm Functionality Test...");
    
    // Cleanup previous runs
    try {
        await fs.unlink(REPORT_FILE);
        console.log("Cleaned up previous report file.");
    } catch (e) {}

    const serverProcess = spawn("node", ["dist/index.js"], {
        cwd: ROOT_DIR,
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, MACO_MONITOR: "false" } // Disable monitor popup for tests
    });

    // Capture stderr for debugging
    let stderrBuffer = "";
    serverProcess.stderr.on("data", (chunk: Buffer) => {
        const str = chunk.toString();
        stderrBuffer += str;
        // console.log("[SERVER-STDERR]", str);
    });

    const sendRequest = (method: string, params: any) => {
        const id = Math.floor(Math.random() * 1000);
        const request = JSON.stringify({
            jsonrpc: "2.0",
            id,
            method,
            params
        }) + "\n";
        serverProcess.stdin.write(request);
        return new Promise((resolve, reject) => {
            let buffer = "";
            const timeout = setTimeout(() => {
                console.error("DEBUG: Server Stderr so far:\n", stderrBuffer);
                reject(new Error("Request timed out: " + id));
            }, 180000); // 3 minute timeout for swarm

            serverProcess.stdout.on("data", (chunk: Buffer) => {
                buffer += chunk.toString();
                if (buffer.includes("\n")) {
                    const lines = buffer.split("\n");
                    buffer = lines.pop() || "";
                    for (const line of lines) {
                        try {
                            const response = JSON.parse(line);
                            if (response.id === id) {
                                clearTimeout(timeout);
                                resolve(response);
                            }
                        } catch (e) { /* ignore non-JSON noise */ }
                    }
                }
            });
        });
    };

    try {
        console.log("Sending parallel_orchestrator request to the swarm...");
        const response: any = await sendRequest("tools/call", {
            name: "parallel_orchestrator",
            arguments: {
                tasks: [
                    {
                        id: "researcher",
                        description: "List the contents of the current directory. Store the first 10 file names as a JSON string in the blackboard key 'discovered_files'.",
                        persona: "research_analyst",
                        max_turns: 3
                    },
                    {
                        id: "mathematician",
                        description: "Calculate 1234 * 1234 and store ONLY the numeric result in the blackboard key 'math_result'.",
                        persona: "expert_developer",
                        max_turns: 2
                    },
                    {
                        id: "reporter_writer",
                        description: `
1. CALL: bb_get(key="discovered_files")
2. CALL: bb_get(key="math_result")
3. Once you have the values from the blackboard, construct a full report.
4. CALL: get_critique(...) - IMPORTANT: You must provide the FULL literal strings for all arguments. Do NOT use '+' or variables inside the CALL: marker. Construct the Git diff and work_done text completely in your message.
5. If APPROVED, CALL: fs_write(...) - Again, provide the FULL report content as a literal string in the 'content' argument.
`,
                        persona: "documenter",
                        max_turns: 10,
                        dependsOn: ["researcher", "mathematician"]
                    }
                ],
                optimization_rounds: 0,
                concurrency: 3
            }
        });

        console.log("Response received from Swarm.");
        
        if (response.result?.isError) {
            console.error("Swarm Failed with Error:", response.result.content[0].text);
            console.error("\n--- SERVER STDERR ---");
            console.error(stderrBuffer);
            process.exit(1);
        }

        console.log("--- SWARM OUTPUT LOGS ---");
        const results = JSON.parse(response.result.content[0].text);
        for (const [id, data] of Object.entries(results)) {
            console.log(`\n[TASK: ${id}]`);
            (data as any).logs.forEach((log: string) => console.log(`  ${log}`));
            console.log(`Final Response: ${(data as any).output.substring(0, 100)}...`);
        }

        console.log("\n--- SERVER STDERR (FULL) ---");
        console.log(stderrBuffer);

        // Verify Disk State
        console.log("\nVerifying 'swarm_test_report.md'...");
        const stats = await fs.stat(REPORT_FILE);
        const content = await fs.readFile(REPORT_FILE, "utf-8");
        
        console.log("Report file exists. Size:", stats.size);
        console.log("Content Preview:\n", content.substring(0, 200));

        if (content.includes("1522756")) {
             console.log("\nVERIFICATION SUCCESS: The report contains the math result!");
        } else {
             console.log("\nVERIFICATION WARNING: Report created but math result might be missing.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Test Crash:", error);
        console.error("\n--- SERVER STDERR (CRASH) ---");
        console.error(stderrBuffer);
        process.exit(1);
    } finally {
        serverProcess.kill();
    }
}

runTest();
