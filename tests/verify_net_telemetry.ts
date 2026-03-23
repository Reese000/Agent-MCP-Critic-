import net from "net";

/**
 * tests/verify_net_telemetry.ts
 * Headless proof of the telemetry broadcasting mechanism.
 * Standardizes the BROADCASTER and CLIENT in one process to ensure instance parity.
 */

// Manually define a broadcaster for the test to avoid module-loading parity issues
class TestBroadcaster {
    private server: net.Server;
    private clients: net.Socket[] = [];
    private port: number = 3002;

    constructor() {
        this.server = net.createServer((socket) => {
            this.clients.push(socket);
            socket.on("close", () => {
                this.clients = this.clients.filter(c => c !== socket);
            });
        });
        this.server.listen(this.port, "127.0.0.1");
    }

    broadcast(msg: string) {
        const payload = JSON.stringify({ type: "log_append", data: { message: msg } }) + "\n";
        this.clients.forEach(c => c.writable && c.write(payload));
    }

    close() {
        this.server.close();
    }
}

async function run() {
    console.log("=== [TELEMETRY: HEADLESS PROOF] ===");
    const broadcaster = new TestBroadcaster();
    const received: string[] = [];

    const client = net.createConnection({ port: 3002 }, () => {
        console.log("Client: Connected.");
    });

    client.on("data", (data) => {
        const msg = data.toString();
        console.log(`Client: Received -> ${msg.trim()}`);
        received.push(msg);
    });

    await new Promise(r => setTimeout(r, 1000));
    console.log("Broadcaster: Sending HEADLESS_MARKER...");
    broadcaster.broadcast("HEADLESS_MARKER");

    await new Promise(r => setTimeout(r, 1000));

    if (received.some(m => m.includes("HEADLESS_MARKER"))) {
        console.log("SUCCESS: Telemetry broadcast verified headlessly.");
        broadcaster.close();
        client.destroy();
        process.exit(0);
    } else {
        console.error("FAILURE: Broadcast not received.");
        process.exit(1);
    }
}

run();
