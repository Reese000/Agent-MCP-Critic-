import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSuccess() {
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
        console.log("Calling get_critique with OpenRouter model: openrouter/free");
        const result = await client.callTool({
            name: "get_critique",
            arguments: {
                user_request: "Implement a simple calculator in Python.",
                work_done: "Implemented add and subtract functions with type checking, docstrings, and a unit test suite using unittest. verified end-to-end execution.",
                git_diff_output: "diff --git a/calculator.py b/calculator.py\nindex 0000000..1234567 100644\n--- a/calculator.py\n+++ b/calculator.py\n@@ -1,1 +1,20 @@\n+def add(a, b):\n+    \"\"\"Adds two numbers.\"\"\"\n+    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):\n+        raise TypeError('Inputs must be numeric')\n+    return a + b\n+\n+def subtract(a, b):\n+    \"\"\"Subtracts two numbers.\"\"\"\n+    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):\n+        raise TypeError('Inputs must be numeric')\n+    return a - b\n",
                raw_test_logs: "Ran 2 tests in 0.001s\nOK",
                model: "openrouter/free"
            }
        });

        console.log("Full Tool Result:");
        console.log(JSON.stringify(result, null, 2));

        const textResult = (result.content?.[0] as any)?.text || "";
        if (textResult.includes("APPROVED")) {
            console.log("\nVERIFICATION SUCCESS: get_critique tool returned APPROVED via OpenRouter.");
        } else {
            console.error("\nVERIFICATION FAILURE: Tool result did not return APPROVED.");
            process.exit(1);
        }

    } catch (error) {
        console.error("Tool call failed:", error);
        process.exit(1);
    } finally {
        await transport.close();
    }
}

testSuccess();
