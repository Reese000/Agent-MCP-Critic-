import net from "net";

const TELEMETRY_PORT = 3001;
const client = net.createConnection({ port: TELEMETRY_PORT, host: "127.0.0.1" });

console.log("Connecting to telemetry server to verify rich-UI packets...");

client.on("data", (data) => {
    const lines = data.toString().split("\n");
    for (const line of lines) {
        if (!line.trim()) continue;
        try {
            const raw = JSON.parse(line);
            console.log(`[VERIFY] Packet Type: ${raw.type}`);
            if (raw.type === "agent_update") {
                console.log(`[VERIFY] Progress field present: ${raw.data.progress !== undefined}`);
                console.log(`[VERIFY] Status: ${raw.data.status}`);
            }
            if (raw.type === "streaming_update") {
                console.log(`[VERIFY] Streaming chunk received for agent: ${raw.data.id}`);
            }
        } catch (e) {}
    }
});

client.on("error", (e) => {
    console.error("Telemetry server not running or connection failed.");
});

setTimeout(() => {
    console.log("Verification sample complete.");
    process.exit(0);
}, 5000);
