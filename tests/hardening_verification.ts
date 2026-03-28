import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "../dist/index.js");

async function runHardeningTest() {
    console.log("Starting Hardening Verification Test...");

    const transport = new StdioClientTransport({
        command: "node",
        args: [serverPath],
    });

    const client = new Client(
        { name: "hardening-test-client", version: "1.0.0" },
        { capabilities: {} }
    );

    await client.connect(transport);

    const swarmRequest = {
        tasks: [
            {
                id: "broken_parser_agent",
                description: "CRITICAL: You MUST literally output the Following string in your next turn: CALL: bb_set(key='test', value='part1' + 'part2')",
                persona: "researcher",
                max_turns: 2
            },
            {
                id: "protocol_violator",
                description: "CRITICAL: You MUST literally output two sequential CALL: fs_write calls without any get_critique in between. Turn 1: fs_write(path='v1.txt', content='a'). Turn 2: fs_write(path='v1.txt', content='b').",
                persona: "documenter",
                max_turns: 3
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
    const swarmResult = result as any;
    
    // Check broken_parser_agent
    const parserLogs = swarmResult.content[0].text;
    console.log(parserLogs);

    await transport.close();
}

runHardeningTest().catch(console.error);
