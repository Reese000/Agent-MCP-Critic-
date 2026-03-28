import blessed from "blessed";
import contrib from "blessed-contrib";
import net from "net";

/**
 * monitor.ts
 * Graphical CLI Dashboard for the MACO Swarm.
 * Uses blessed-contrib for real-time visualization of agent states and logs.
 */

const screen = blessed.screen({
    smartCSR: true,
    title: "MACO Swarm Monitor",
});

const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

// Agent Status Table
const agentTable = grid.set(0, 0, 6, 8, contrib.table, {
    keys: true,
    fg: "white",
    label: " Active Agents ",
    columnSpacing: 1,
    columnWidth: [10, 30, 12, 10, 10],
});

// Blackboard Explorer
const bbTree = grid.set(0, 8, 6, 4, contrib.tree, {
    label: " Blackboard State ",
    style: { text: "cyan" },
});

// Global Log Feed
const logBox = grid.set(6, 0, 6, 12, contrib.log, {
    fg: "green",
    label: " Swarm Interaction Feed ",
    tags: true,
});

// Debounced Render Logic
let renderTimeout: NodeJS.Timeout | null = null;
function requestRender() {
    if (renderTimeout) return;
    renderTimeout = setTimeout(() => {
        screen.render();
        renderTimeout = null;
    }, 100); // Max 10 FPS
}

// Define the expected structure of the telemetry update
interface AgentState {
    persona: string;
    status: string;
    startTime: number;
    endTime?: number;
}

interface LogEntry {
    level: string;
    message: string;
}

interface SwarmUpdate {
    agents?: Record<string, AgentState>;
    blackboard?: Record<string, any>;
    logs?: LogEntry[];
}

// Global State for the Monitor
const agentState: Record<string, any> = {};
const blackboardState: Record<string, any> = {};

// Connect to Telemetry Server with Reconnection Logic
function connect() {
    const client = net.createConnection({ port: 3001 });

    client.on("connect", () => {
        logBox.log("{blue-fg}CONNECTED to MACO Swarm Telemetry{/blue-fg}");
        requestRender();
    });

    let buffer = "";
    client.on("data", (data) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last partial line

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const raw = JSON.parse(line);

                // Handle the wrapped format from Telemetry.ts
                if (raw.type === "agent_update") {
                    const state = raw.data;
                    agentState[state.id] = state;
                    
                    const tableData = Object.entries(agentState).map(([id, s]: [string, any]) => [
                        id.substring(0, 8),
                        s.persona.substring(0, 28),
                        s.status.toUpperCase(),
                        `${Math.round((s.endTime ? s.endTime - s.startTime : Date.now() - s.startTime) / 1000)}s`,
                        s.lastTool || ""
                    ]);
                    agentTable.setData({
                        headers: ["ID", "PERSONA", "STATUS", "UPTIME", "LAST TOOL"],
                        data: tableData
                    });
                }

                if (raw.type === "bb_update") {
                    blackboardState[raw.data.key] = raw.data.value;

                    const treeData: any = {
                        name: "Blackboard",
                        extended: true,
                        children: {}
                    };
                    Object.entries(blackboardState).forEach(([k, v]) => {
                        const valStr = typeof v === "object" ? JSON.stringify(v) : String(v);
                        treeData.children[`${k}: ${valStr.substring(0, 30)}${valStr.length > 30 ? "..." : ""}`] = { name: k };
                    });
                    bbTree.setData(treeData);
                }

                if (raw.type === "log_append") {
                    const log = raw.data;
                    const color = log.level === "error" ? "{red-fg}" : (log.level === "warn" ? "{yellow-fg}" : "");
                    logBox.log(`${color}[${log.level.toUpperCase()}] ${log.message}{/}`);
                }
            } catch (e) {
                // Ignore parse errors for malformed lines
            }
        }
        requestRender();
    });

    client.on("error", (err: any) => {
        if (err.code === "ECONNREFUSED") {
            // Silently wait for server to start
        } else {
            logBox.log(`{red-fg}[ERROR] Telemetry: ${err.message}{/}`);
            requestRender();
        }
    });

    client.on("close", () => {
        // Attempt reconnection after 3 seconds
        setTimeout(connect, 3000);
    });
}

connect();

screen.key(["escape", "q", "C-c"], () => {
    process.exit(0);
});

logBox.log("{yellow-fg}Waiting for MACO Swarm activity...{/yellow-fg}");
requestRender();
