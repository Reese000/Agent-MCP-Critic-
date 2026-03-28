import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "../dist/index.js");

async function runSuccessTest() {
    console.log("Starting Success Path Verification...");
    const reportPath = path.join(__dirname, "../success_report.md");
    
    // Cleanup
    try { await fs.unlink(reportPath); } catch {}

    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
    });

    const client = new Client(
        { name: "success-test-client", version: "1.0.0" },
        { capabilities: {} }
    );

    await client.connect(transport);

    const swarmRequest = {
        tasks: [
            {
                id: "doc_agent",
                description: `
1. CALL: get_critique(
     user_request="Create a simple success file.",
     work_done="Created success_report.md with a single line of text.",
     git_diff_output="diff --git a/success_report.md b/success_report.md\\nnew file mode 100644\\n--- /dev/null\\n+++ b/success_report.md\\n@@ -0,0 +1 @@\\n+SUCCESS",
     raw_test_logs="Local validation: PASS"
   )
2. If APPROVED, CALL: fs_write(path="success_report.md", content="SUCCESS")
`,
                persona: "documenter",
                max_turns: 5
            }
        ]
    };

    console.log("Sending swarm request...");
    const result = await client.callTool({
        name: "parallel_orchestrator",
        arguments: swarmRequest
    });

    console.log("Response received.");
    console.log("--- SWARM LOGS ---");
    console.log(JSON.stringify(result, null, 2));

    try {
        const stats = await fs.stat(reportPath);
        console.log(`\nVerification: success_report.md CREATED (Size: ${stats.size} bytes)`);
    } catch (e) {
        console.log("\nVerification: FAILED - success_report.md was not created.");
    }

    await transport.close();
}

runSuccessTest().catch(console.error);
