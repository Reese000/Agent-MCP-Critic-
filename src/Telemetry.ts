import net from "net";

/**
 * Telemetry.ts
 * Internal state broadcaster for the MACO Swarm Monitor Dashboard.
 * Uses a local TCP socket to broadcast state updates to the monitor CLI.
 */

export interface AgentState {
    id: string;
    persona: string;
    status: "idle" | "reasoning" | "executing";
    lastTool?: string;
    turnCount: number;
    startTime: number;
}

export interface SwarmUpdate {
    type: "agent_update" | "bb_update" | "log_append";
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
            socket.on("close", () => {
                this.clients = this.clients.filter(c => c !== socket);
            });
            
            socket.on("error", () => {
                this.clients = this.clients.filter(c => c !== socket);
            });
        });

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
            if (client.writable) {
                try {
                    client.write(payload);
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
        this.broadcast({ type: "bb_update", data: { key, value } });
    }

    sendLog(message: string, level: "info" | "warn" | "error" = "info") {
        this.broadcast({ type: "log_append", data: { message, level, timestamp: Date.now() } });
    }
}

export const telemetry = new TelemetryBroadcaster();
