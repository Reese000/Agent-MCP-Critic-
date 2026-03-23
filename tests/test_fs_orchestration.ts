import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "..");
const TEST_A_DIR = path.join(ROOT_DIR, "test_run_A");
const TEST_B_DIR = path.join(ROOT_DIR, "test_run_B");

async function runTest() {
    console.log("Starting FS Orchestration Test...");
    
    // Cleanup previous runs
    await fs.rm(TEST_A_DIR, { recursive: true, force: true });
    await fs.rm(TEST_B_DIR, { recursive: true, force: true });

    const serverProcess = spawn("node", ["dist/index.js"], {
        cwd: ROOT_DIR,
        stdio: ["pipe", "pipe", "inherit"]
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
        return new Promise((resolve) => {
            let buffer = "";
            serverProcess.stdout.on("data", (chunk) => {
                buffer += chunk.toString();
                if (buffer.includes("\n")) {
                    try {
                        const response = JSON.parse(buffer);
                        if (response.id === id) resolve(response);
                    } catch (e) { /* wait for more data */ }
                }
            });
        });
    };

    try {
        const response: any = await sendRequest("tools/call", {
            name: "parallel_orchestrator",
            arguments: {
                tasks: [
                    {
                        id: "task_a",
                        description: `Create a directory at "${TEST_A_DIR}" and write a file named "hello_A.txt" inside it with the content "Task A was here".`,
                        persona: "expert_developer",
                        max_turns: 3
                    },
                    {
                        id: "task_b",
                        description: `List the contents of "${ROOT_DIR}" and then write that JSON result to a file at "${ROOT_DIR}/ls_test.json". You MUST use two separate CALL: markers sequentially.`,
                        persona: "research_analyst",
                        max_turns: 5
                    }
                ],
                optimization_rounds: 1,
                concurrency: 2
            }
        });

        console.log("Response received:", JSON.stringify(response, null, 2));

        if (response.result?.isError) {
            console.error("Test Failed with Error:", response.result.content[0].text);
            process.exit(1);
        }

        // Verify Disk State
        const fileA = await fs.readFile(path.join(TEST_A_DIR, "hello_A.txt"), "utf-8");
        const fileB = await fs.readFile(path.join(ROOT_DIR, "ls_test.json"), "utf-8");

        console.log("Verification Success!");
        console.log("File A content:", fileA);
        console.log("File B size:", fileB.length);

        process.exit(0);
    } catch (error) {
        console.error("Test Crash:", error);
        process.exit(1);
    } finally {
        serverProcess.kill();
    }
}

runTest();
