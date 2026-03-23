import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";

async function runFix() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["--loader", "ts-node/esm", "src/index.ts"]
    });
    const client = new Client({ name: "fix-client", version: "1.0.0" }, { capabilities: {} });
    await client.connect(transport);

    const result = await client.request({
        method: "tools/call",
        params: {
            name: "parallel_orchestrator",
            arguments: {
                tasks: [
                    {
                        id: "fix_kinematics",
                        description: "Modify c:/Users/reese/OneDrive/Desktop/AI/AI CAM 2.0/engine/simulator/kinematics.py. In the GcodeParser and KinematicsEngine initialization, ensure all parameters like default_tool_change_duration are stored as instance attributes (e.g., self.default_tool_change_duration).",
                        persona: "error_fixer"
                    },
                    {
                        id: "verify_fix",
                        dependsOn: ["fix_kinematics"],
                        description: "Run 'pytest c:/Users/reese/OneDrive/Desktop/AI/AI CAM 2.0/test_headless_api.py' and capture the logs to verify no AttributeErrors occur during kinematics build.",
                        persona: "tester"
                    }
                ]
            }
        }
    }, CallToolResultSchema);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
}
runFix();
