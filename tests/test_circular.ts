import { spawn } from "child_process";

async function testCircularDependency() {
    console.log("=== STARTING CIRCULAR DEPENDENCY TEST ===");

    const child = spawn("node", ["dist/index.js"], {
        env: process.env,
        stdio: ["pipe", "pipe", "inherit"]
    });

    const sendRequest = (req: any) => {
        child.stdin.write(JSON.stringify(req) + "\n");
    };

    child.stdout.on("data", (data) => {
        const line = data.toString();
        try {
            const parsed = JSON.parse(line);
            if (parsed.error) {
                console.log("\nDetected Expected Error:", parsed.error.message);
                if (parsed.error.message.includes("Circular dependency")) {
                    console.log("SUCCESS: Circular dependency caught.");
                    child.kill();
                    process.exit(0);
                }
            }
        } catch (e) {
            // Ignore noise
        }
    });

    // Wait for server initialization
    await new Promise(resolve => setTimeout(resolve, 2000));

    const circularRequest = {
        jsonrpc: "2.0",
        id: "circular_test",
        method: "tools/call",
        params: {
            name: "parallel_orchestrator",
            arguments: {
                tasks: [
                    { id: "taskA", description: "Task A", persona: "developer", dependsOn: ["taskB"] },
                    { id: "taskB", description: "Task B", persona: "developer", dependsOn: ["taskA"] }
                ]
            }
        }
    };

    console.log("Sending circular_orchestrator request...");
    sendRequest(circularRequest);

    // Timeout if no error detected
    setTimeout(() => {
        console.error("FAIL: Circular dependency was NOT caught in 10 seconds.");
        child.kill();
        process.exit(1);
    }, 10000);
}

testCircularDependency().catch(err => {
    console.error("Circular test execution failed:", err);
    process.exit(1);
});
