import net from "net";

/**
 * mock_swarm_telemetry.ts
 * Generates high-density mock data for the MACO Swarm Monitor.
 * Use this to verify the TUI dashboard during manual testing.
 */

const port = 3001;
const clients: net.Socket[] = [];

const server = net.createServer((socket) => {
    clients.push(socket);
    console.log("[MOCK] Monitor Connected.");
    socket.on("close", () => {
        const idx = clients.indexOf(socket);
        if (idx > -1) clients.splice(idx, 1);
    });
});

server.listen(port, "127.0.0.1", () => {
    console.log(`[MOCK] Telemetry broadcast server listening on port ${port}`);
    console.log(">>> RUN start_monitor.bat NOW to see the data flow <<<");
});

function broadcast(data: any) {
    const payload = JSON.stringify(data) + "\n";
    clients.forEach(c => c.write(payload));
}

const agents = [
    "researcher", "developer", "auditor", "critic", "security_bot", "optimizer"
];

let turn = 0;

setInterval(() => {
    turn++;
    // 1. Agent Updates
    const agentId = `agent_${Math.floor(Math.random() * agents.length)}`;
    const status = Math.random() > 0.5 ? "reasoning" : "executing";
    broadcast({
        agents: {
            [agentId]: {
                persona: agents[Math.floor(Math.random() * agents.length)],
                status: status,
                startTime: Date.now() - 5000,
                lastTool: status === "executing" ? "fs_read" : undefined
            }
        }
    });

    // 2. Blackboard Updates
    if (turn % 5 === 0) {
        broadcast({
            blackboard: {
                [`task_${turn}`]: "In Progress",
                "_sys_critique_status": "APPROVED",
                "last_active_agent": agentId
            }
        });
    }

    // 3. Logs
    const levels = ["info", "warn", "error"];
    const level = levels[Math.floor(Math.random() * levels.length)];
    broadcast({
        logs: [{
            level,
            message: `[${agentId}] Step ${turn}: ${level === "error" ? "Potential logic bypass detected" : "Processing wave sequence"}`
        }]
    });

}, 800);
