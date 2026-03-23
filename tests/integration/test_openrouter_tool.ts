import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testTool() {
    const transport = new StdioClientTransport({
        command: "node",
        args: [path.join(__dirname, "../../dist/index.js")],
    });

    const client = new Client({
        name: "test-client",
        version: "1.0.0",
    }, {
        capabilities: {},
    });

    await client.connect(transport);

    console.log("Connected to Critic Server.");

    try {
        console.log("Calling get_critique with OpenRouter model...");
        const result = await client.callTool({
            name: "get_critique",
            arguments: {
                user_request: "Implement a simple calculator in Python.",
                work_done: "I created a calculator.py file with add and subtract functions. I also added tests.",
                git_diff_output: "diff --git a/calculator.py b/calculator.py\nindex 0000000..1234567 100644\n--- a/calculator.py\n+++ b/calculator.py\n@@ -1,1 +1,2 @@\n+print('hello')\n",
                raw_test_logs: "test_passed",
                model: "openrouter/free"
            }
        });

        console.log("Full Tool Result:");
        console.log(JSON.stringify(result, null, 2));

        const textResult = (result.content?.[0] as any)?.text || "";
        if (textResult.includes("[STATUS]")) {
            console.log("\nVERIFICATION SUCCESS: get_critique tool is working via OpenRouter.");
        } else {
            console.error("\nVERIFICATION FAILURE: Tool result does not contain expected status.");
            process.exit(1);
        }

    } catch (error) {
        console.error("Tool call failed:", error);
        process.exit(1);
    } finally {
        await transport.close();
    }
}

testTool();
