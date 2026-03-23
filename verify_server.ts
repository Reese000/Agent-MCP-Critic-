import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyServer() {
    console.log("=== Agent-MCP-Critic Health Check ===");
    
    const serverPath = path.join(__dirname, "dist", "src", "index.js");
    console.log(`Connecting to server at: ${serverPath}`);

    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
        env: { ...process.env, OPENROUTER_API_KEY: "test-key" }
    });

    const client = new Client({
        name: "health-check-client",
        version: "1.0.0"
    }, {
        capabilities: {}
    });

    try {
        await client.connect(transport);
        console.log("[PASS] Connected to MCP server.");

        const tools = await client.listTools();
        console.log(`[PASS] Server reported ${tools.tools.length} available tools.`);
        
        const toolNames = tools.tools.map(t => t.name);
        console.log("Tools detected:", toolNames);

        if (toolNames.includes("get_critique")) {
            console.log("=== HEALTH CHECK SUCCESSFUL ===");
            process.exit(0);
        } else {
            console.error("=== HEALTH CHECK FAILED: missing get_critique tool ===");
            process.exit(1);
        }
    } catch (error) {
        console.error("=== HEALTH CHECK ERROR ===");
        console.error(error);
        process.exit(1);
    }
}

verifyServer();
