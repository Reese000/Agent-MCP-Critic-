import net from "net";

/**
 * Telemetry.ts
 * Internal state broadcaster for the MACO Swarm Monitor Dashboard.
 * Uses a local TCP socket to broadcast state updates to the monitor CLI.
 */

export interface AgentState {
    id: string;
    persona: string;
    status: "idle" | "reasoning" | "executing" | "error";
    lastTool?: string;
    turnCount: number;
    startTime: number;
    endTime?: number;
    progress?: number; // 0-100
    streamingOutput?: string; // Latest text chunk or thinking
}

export interface SwarmUpdate {
    type: "agent_update" | "blackboard_update" | "log_append" | "heartbeat" | "streaming_update";
    data: any;
}

class TelemetryBroadcaster {
    private server: net.Server;
    private clients: net.Socket[] = [];
    private port: number = Number(process.env.MACO_TELEMETRY_PORT) || 3001;

    constructor() {
        this.server = net.createServer((socket) => {
            this.clients.push(socket);

            // CRITICAL: Cleanup to prevent memory leaks and write errors
            socket.setNoDelay(true);
            socket.setKeepAlive(true, 10000); // 10s keepalive

            socket.on("close", () => {
                this.clients = this.clients.filter(c => c !== socket);
            });

            socket.on("error", (err: any) => {
                if (err.code !== "ECONNRESET") {
                    console.error(`[TELEMETRY] Socket error: ${err.message}`);
                }
                this.clients = this.clients.filter(c => c !== socket);
                socket.destroy();
            });
        });

        // Periodic Heartbeat to keep connections alive and detect dead peers
        setInterval(() => {
            this.broadcast({ type: "heartbeat", data: { timestamp: Date.now() } });
        }, 30000);


        // CRITICAL: Handling EADDRINUSE gracefully to prevent process crash
        this.server.on("error", (e: any) => {
            if (e.code === "EADDRINUSE") {
                console.error(`[TELEMETRY] FATAL: Port ${this.port} already in use. Telemetry will be disabled.`);
            } else {
                console.error(`[TELEMETRY] Server error: ${e.message}`);
            }
        });

        try {
            this.server.listen(this.port, "127.0.0.1", () => {
                console.error(`[TELEMETRY] Broadcaster listening on port ${this.port}`);
            });
        } catch (err: any) {
            console.error(`[TELEMETRY] FATAL: Failed to initiate server listen on port ${this.port}: ${err.message}`);
        }
    }

    broadcast(update: SwarmUpdate) {
        const payload = JSON.stringify(update) + "\n";
        this.clients = this.clients.filter(client => {
            if (client.writable && !client.destroyed) {
                try {
                    const success = client.write(payload);
                    if (!success) {
                        // Buffer full, wait for drain or destroy if it hangs too long
                        // For now we just return true and hope it drains
                    }
                    return true;
                } catch (e) {
                    client.destroy();
                    return false;
                }
            }
            return false;
        });
    }

    sendAgentUpdate(agent: AgentState) {
        this.broadcast({ type: "agent_update", data: agent });
    }

    sendBlackboardUpdate(key: string, value: string) {
        this.broadcast({ type: "blackboard_update", data: { key, value } });
    }

    sendStreamingUpdate(agentId: string, chunk: string) {
        this.broadcast({ type: "streaming_update", data: { id: agentId, chunk } });
    }

    sendLog(message: string, level: "info" | "warn" | "error" = "info") {
        this.broadcast({ type: "log_append", data: { message, level, timestamp: Date.now() } });
    }
}

export const telemetry = new TelemetryBroadcaster();
