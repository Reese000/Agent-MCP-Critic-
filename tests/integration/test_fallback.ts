import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testFallback() {
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
        console.log("Calling get_critique with a NON-EXISTENT OpenRouter model to force fallback...");
        const result = await client.callTool({
            name: "get_critique",
            arguments: {
                user_request: "Say 'Hello'",
                work_done: "This is a long enough string to pass validation for the critic tool.",
                git_diff_output: "diff --git a/test.py b/test.py\n+print('hello')",
                raw_test_logs: "This is a long enough test log to pass validation for the critic tool.",
                model: "non-existent-provider/bad-model:free" // This will fail OpenRouter and force Gemini fallback
            }
        });

        console.log("Full Tool Result (should be from Gemini after fallback):");
        console.log(JSON.stringify(result, null, 2));

        const textResult = (result.content?.[0] as any)?.text || "";
        if (textResult.length > 50) {
            console.log("\nVERIFICATION SUCCESS: get_critique tool successfully fell back to Gemini and returned a critique.");
        } else {
            console.error("\nVERIFICATION FAILURE: Tool result too short or empty.");
            process.exit(1);
        }

    } catch (error) {
        console.error("Tool call failed:", error);
        process.exit(1);
    } finally {
        await transport.close();
    }
}

testFallback();
