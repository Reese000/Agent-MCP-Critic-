import net from "net";

const TELEMETRY_PORT = 3001;

async function simulate() {
    console.log("--- STARTING SWARM SIMULATION FOR MANUAL TESTING ---");
    
    // Connect as a monitor client to see what the broadcaster sends
    const client = net.createConnection({ port: TELEMETRY_PORT, host: "127.0.0.1" });
    client.on("data", (data) => {
        // console.log(`[MONITOR RCVD] ${data.toString()}`);
    });

    const broadcaster = net.createConnection({ port: TELEMETRY_PORT, host: "127.0.0.1" });
    
    const send = (msg: any) => {
        broadcaster.write(JSON.stringify(msg) + "\n");
    };

    const agentId = "agent_test_123";
    
    // 1. Initial IDLE state
    console.log("Testing IDLE status (Green)...");
    send({ type: "agent_update", data: { id: agentId, persona: "TESTER", status: "idle", startTime: Date.now(), turnCount: 0 } });
    await new Promise(r => setTimeout(r, 1000));

    // 2. REASONING state with Progress (Yellow)
    console.log("Testing REASONING status (Yellow) with Progress Bar...");
    for (let i = 0; i <= 100; i += 20) {
        send({ type: "agent_update", data: { id: agentId, persona: "TESTER", status: "reasoning", startTime: Date.now(), turnCount: 0, progress: i } });
        await new Promise(r => setTimeout(r, 500));
    }

    // 3. Streaming Text
    console.log("Testing REAL-TIME STREAMING (Detail Monitor Support)...");
    const text = "The quick brown fox jumps over the lazy dog. ".split(" ");
    for (const word of text) {
        send({ type: "streaming_update", data: { id: agentId, chunk: word + " " } });
        await new Promise(r => setTimeout(r, 200));
    }

    // 4. EXECUTING (Cyan)
    console.log("Testing EXECUTING status (Cyan)...");
    send({ type: "agent_update", data: { id: agentId, persona: "TESTER", status: "executing", lastTool: "fs_read", startTime: Date.now(), turnCount: 1, progress: 100 } });
    await new Promise(r => setTimeout(r, 1000));

    // 5. ERROR (Red)
    console.log("Testing ERROR status (Red)...");
    send({ type: "agent_update", data: { id: agentId, persona: "TESTER", status: "error", startTime: Date.now(), turnCount: 1 } });
    
    console.log("--- SIMULATION COMPLETE ---");
    process.exit(0);
}

simulate().catch(err => {
    console.error("Simulation failed. (Is the Critic MCP server running?)", err.message);
    process.exit(1);
});
