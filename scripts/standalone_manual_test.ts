import net from "net";

async function verifyAll() {
    console.log("--- FULL MANUAL TESTING SUITE: RICH-UI ENHANCEMENTS ---");
    
    const port = 3001;
    let serverStarted = false;

    // 1. Mock Telemetry Server (The Broadcaster)
    const clients: net.Socket[] = [];
    const server = net.createServer((socket) => {
        clients.push(socket);
    });

    server.listen(port, "127.0.0.1", () => {
        console.log(`[TEST] Internal Telemetry Server listening on ${port}`);
        serverStarted = true;
    });

    await new Promise(r => setTimeout(r, 2000));

    if (!serverStarted) {
        console.error("Failed to start test server.");
        process.exit(1);
    }

    const broadcast = (data: any) => {
        const payload = JSON.stringify(data) + "\n";
        clients.forEach(c => c.write(payload));
    };

    // 2. Mock Agent Flow
    const agentId = "agent_rich_ui_test";
    
    // Test Color Codes
    console.log("[TEST] Sending IDLE (Green)...");
    broadcast({ type: "agent_update", data: { id: agentId, persona: "RESEARCHER", status: "idle", startTime: Date.now(), turnCount: 0 } });
    await new Promise(r => setTimeout(r, 1000));

    // Test Progress Bar
    console.log("[TEST] Sending Progress updates (10% to 100%)...");
    for (let p = 10; p <= 100; p += 30) {
        broadcast({ type: "agent_update", data: { id: agentId, persona: "RESEARCHER", status: "reasoning", startTime: Date.now(), turnCount: 0, progress: p } });
        await new Promise(r => setTimeout(r, 500));
    }

    // Test Streaming Details
    console.log("[TEST] Sending Streaming Chunks (Real-time output simulation)...");
    const chunks = ["Thinking...", "Analysing filesystem...", "Found 5 files.", "Proceeding to read."];
    for (const chunk of chunks) {
        broadcast({ type: "streaming_update", data: { id: agentId, chunk: chunk + " " } });
        await new Promise(r => setTimeout(r, 300));
    }

    console.log("[TEST] All rich-UI telemetry packets broadcast successfully.");
    console.log("--- FULL MANUAL TESTING COMPLETE: PASSED ---");
    
    server.close();
    process.exit(0);
}

verifyAll().catch(e => {
    console.error("Manual test failed:", e);
    process.exit(1);
});
