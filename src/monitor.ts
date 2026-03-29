import blessed from "blessed";
import contrib from "blessed-contrib";
import net from "net";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// --- BLACK BOX LOGGING ---
const CRASH_LOG = path.join(process.cwd(), "monitor_crash.log");
function logCrash(err: any) {
    const msg = `[${new Date().toISOString()}] FATAL CRASH: ${err.stack || err}\
`;
    try {
        fs.appendFileSync(CRASH_LOG, msg);
    } catch (e) {}
    console.error(msg);
}

process.on("uncaughtException", (err) => {
    logCrash(err);
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    logCrash(reason);
    process.exit(1);
});
// --------------------------

// Load environment variables
dotenv.config();

/**
 * monitor.ts
 * Unified graphical CLI dashboard for the MACO Swarm.
 * Combines the main dashboard with a detailed agent-log view.
 * Features efficient partial redraws for the agent table.
 */

const screen = blessed.screen({
    smartCSR: true,
    title: "MACO Swarm Monitor",
    mouse: true,
    keys: true,
});

// --- STATE MANAGEMENT ---
const initialView = process.argv.includes("--details") || process.argv.includes("-d") ? 'details' : 'dashboard';
let currentView: 'dashboard' | 'details' = initialView;
const agentState: Record<string, any> = {};
const blackboardState: Record<string, any> = {};

// For efficient table updates
const agentIdToRowIndex: Record<string, number> = {};
let tableData: string[][] = [];

// For detail view
const agentBoxes: Record<string, any> = {};


// --- UI SETUP ---

// Dashboard View
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

const agentTable = grid.set(0, 0, 6, 8, contrib.table, {
    keys: true,
    fg: "white",
    label: " Active Agents (Press 'd' for details) ",
    columnSpacing: 1,
    columnWidth: [15, 45, 12, 10, 20],
});

const bbTree = grid.set(0, 8, 6, 4, contrib.tree, {
    label: " Blackboard State ",
    style: { text: "cyan" },
});

const logBox = grid.set(6, 0, 6, 12, contrib.log, {
    fg: "green",
    label: " Swarm Interaction Feed ",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: " ", track: { bg: "cyan" }, style: { inverse: true } }
});

const dashboardWidgets = [agentTable, bbTree, logBox];

// Detail View Container (initially hidden)
const detailContainer = blessed.box({
    parent: screen,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    hidden: true,
    label: " Agent Live Logs (Press 'b' to go back) ",
    border: 'line',
    style: { border: { fg: 'yellow' } }
});


// --- UI HELPER FUNCTIONS ---

let renderTimeout: NodeJS.Timeout | null = null;
function requestRender() {
    if (renderTimeout) return;
    renderTimeout = setTimeout(() => {
        screen.render();
        renderTimeout = null;
    }, 100); // Max 10 FPS
}

function showDashboard() {
    if (currentView === 'dashboard') return;
    detailContainer.hide();
    dashboardWidgets.forEach(w => w.show());
    currentView = 'dashboard';
    logBox.log("{yellow-fg}Switched to Dashboard View.{/yellow-fg}");
    requestRender();
}

function showDetails() {
    if (currentView === 'details') return;
    dashboardWidgets.forEach(w => w.hide());
    detailContainer.show();
    updateDetailGridLayout();
    currentView = 'details';
    logBox.log("{yellow-fg}Switched to Agent Detail View.{/yellow-fg}");
    requestRender();
}

function updateDetailGridLayout() {
    const ids = Object.keys(agentBoxes);
    const count = ids.length;
    if (count === 0) return;

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const rowHeightPercent = 100 / rows;
    const colWidthPercent = 100 / cols;

    ids.forEach((id, index) => {
        const r = Math.floor(index / cols);
        const c = index % cols;
        
        const box = agentBoxes[id];
        box.position.top = `${r * rowHeightPercent}%`;
        box.position.left = `${c * colWidthPercent}%`;
        box.position.width = `${colWidthPercent}%`;
        box.position.height = `${rowHeightPercent}%`;
        
        detailContainer.append(box);
    });
    requestRender();
}


// --- TELEMETRY CONNECTION ---

const TELEMETRY_PORT = Number(process.env.MACO_TELEMETRY_PORT) || 3001;

function connect() {
    const client = net.createConnection({ port: TELEMETRY_PORT, host: "127.0.0.1" });

    client.on("connect", () => {
        logBox.log("{blue-fg}CONNECTED to MACO Swarm Telemetry{/blue-fg}");
        requestRender();
    });

    let buffer = "";
    client.on("data", (data) => {
        buffer += data.toString();
        const lines = buffer.split("\
");
        buffer = lines.pop() || ""; // Keep the last partial line

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const raw = JSON.parse(line);

                // --- AGENT UPDATE ---
                if (raw.type === "agent_update") {
                    const state = raw.data;
                    const agentId = state.id;
                    agentState[agentId] = state;
                    
                    // Efficient Table Update Logic
                    const statusColor = 
                        state.status === "reasoning" ? "{yellow-fg}" :
                        state.status === "executing" ? "{cyan-fg}" :
                        state.status === "idle"      ? "{green-fg}" :
                        state.status === "error"     ? "{red-fg}" :
                        "{white-fg}";

                    const progressVal = state.progress || 0;
                    const progressBar = `[${'='.repeat(Math.floor(progressVal/15))}${' '.repeat(7-Math.floor(progressVal/15))}] ${progressVal}%`;

                    const newRow = [
                        agentId.substring(0, 8),
                        state.persona.substring(0, 35),
                        `${statusColor}${state.status.toUpperCase()}{/}`,
                        progressBar,
                        `${Math.round((state.endTime ? state.endTime - state.startTime : Date.now() - state.startTime) / 1000)}s`
                    ];

                    if (agentIdToRowIndex[agentId] !== undefined) {
                        const rowIndex = agentIdToRowIndex[agentId];
                        tableData[rowIndex] = newRow;
                    } else {
                        tableData.push(newRow);
                        agentIdToRowIndex[agentId] = tableData.length - 1;
                    }
                    agentTable.setData({ headers: ["ID", "PERSONA", "STATUS", "PROGRESS", "UPTIME"], data: tableData });

                    // Detail View Box Creation
                    if (!agentBoxes[agentId]) {
                        agentBoxes[agentId] = blessed.log({
                            label: ` AGENT: ${agentId.substring(0,8)} (${state.persona.substring(0,15)}...) `,
                            border: "line",
                            style: { border: { fg: "cyan" } },
                            scrollable: true,
                            alwaysScroll: true,
                            mouse: true,
                            scrollbar: { ch: " ", track: { bg: "grey" }, style: { inverse: true } }
                        });
                        if (currentView === 'details') {
                            updateDetailGridLayout();
                        }
                    }
                }

                // --- AGENT STOP ---
                if (raw.type === "agent_stop") {
                    const { id } = raw.data;
                    if (agentState[id]) {
                        agentState[id].status = "done";
                        agentState[id].progress = 100;
                        agentState[id].endTime = Date.now();
                        
                        // Show "DONE" at 100% for a few seconds
                        const rowIndex = agentIdToRowIndex[id];
                        if (rowIndex !== undefined) {
                            tableData[rowIndex] = [
                                id.substring(0, 8),
                                agentState[id].persona.substring(0, 35),
                                "{green-fg}DONE{/}",
                                "[=======] 100%",
                                `${Math.round((agentState[id].endTime - agentState[id].startTime) / 1000)}s`
                            ];
                            agentTable.setData({ headers: ["ID", "PERSONA", "STATUS", "PROGRESS", "UPTIME"], data: tableData });
                        }

                        // Auto-cleanup after 5s
                        setTimeout(() => {
                            delete agentState[id];
                            delete agentBoxes[id];
                            
                            // Fully rebuild table to close the gap
                            const newTableData: string[][] = [];
                            const newIndexMap: Record<string, number> = {};
                            
                            Object.entries(agentState).forEach(([aid, state]) => {
                                const statusColor = 
                                    state.status === "reasoning" ? "{yellow-fg}" :
                                    state.status === "executing" ? "{cyan-fg}" :
                                    state.status === "idle"      ? "{green-fg}" :
                                    state.status === "error"     ? "{red-fg}" :
                                    state.status === "done"      ? "{green-fg}" : "{white-fg}";

                                const progressVal = state.progress || 0;
                                const progressBar = `[${'='.repeat(Math.floor(progressVal/15))}${' '.repeat(7-Math.floor(progressVal/15))}] ${progressVal}%`;
                                
                                newTableData.push([
                                    aid.substring(0, 8),
                                    state.persona.substring(0, 35),
                                    `${statusColor}${state.status.toUpperCase()}{/}`,
                                    progressBar,
                                    `${Math.round((state.endTime ? state.endTime - state.startTime : Date.now() - state.startTime) / 1000)}s`
                                ]);
                                newIndexMap[aid] = newTableData.length - 1;
                            });

                            // ATOMIC UPDATE
                            tableData.length = 0;
                            tableData.push(...newTableData);
                            Object.keys(agentIdToRowIndex).forEach(k => delete agentIdToRowIndex[k]);
                            Object.assign(agentIdToRowIndex, newIndexMap);

                            agentTable.setData({ headers: ["ID", "PERSONA", "STATUS", "PROGRESS", "UPTIME"], data: tableData });
                            
                            if (currentView === 'details') {
                                updateDetailGridLayout();
                            }
                            requestRender();
                        }, 5000);
                    }
                }

                // --- BLACKBOARD UPDATE ---
                if (raw.type === "blackboard_update") {
                    blackboardState[raw.data.key] = raw.data.value;
                    const treeData: any = { name: "Blackboard", extended: true, children: {} };
                    Object.entries(blackboardState).forEach(([k, v]) => {
                        const valStr = typeof v === "object" ? JSON.stringify(v) : String(v);
                        treeData.children[`${k}: ${valStr.substring(0, 30)}${valStr.length > 30 ? "..." : ""}`] = { name: k };
                    });
                    bbTree.setData(treeData);
                }

                // --- GLOBAL LOG ---
                if (raw.type === "log_append") {
                    const log = raw.data;
                    const color = log.level === "error" ? "{red-fg}" : (log.level === "warn" ? "{yellow-fg}" : "");
                    logBox.log(`${color}[${log.level.toUpperCase()}] ${log.message}{/}`);
                }

                // --- AGENT STREAMING LOG (for detail view) ---
                if (raw.type === "streaming_update") {
                    const { id, chunk } = raw.data;
                    if (agentBoxes[id]) {
                        agentBoxes[id].log(chunk);
                    }
                }

            } catch (e) {
                // Ignore parse errors for malformed lines
            }
        }
        requestRender();
    });

    client.on("error", (err: any) => {
        if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") {
            // Silently wait for server to start/restart
        } else {
            logBox.log(`{red-fg}[ERROR] Telemetry: ${err.message}{/}`);
            requestRender();
        }
    });

    client.on("close", () => {
        setTimeout(connect, 3000);
    });
}

// --- KEYBINDINGS & INITIALIZATION ---

screen.key(["escape", "q", "C-c"], () => {
    if (currentView === 'details') {
        showDashboard();
    } else {
        process.exit(0);
    }
});

screen.key(['d'], showDetails);
screen.key(['b'], showDashboard);

// Manual Scrolling Logic for Log Feed
logBox.on("wheeldown", () => logBox.scroll(2));
logBox.on("wheelup", () => logBox.scroll(-2));
screen.key(["pageup"], () => { if(currentView === 'dashboard') logBox.scroll(-10) });
screen.key(["pagedown"], () => { if(currentView === 'dashboard') logBox.scroll(10) });
screen.key(["up"], () => { if(currentView === 'dashboard') logBox.scroll(-1) });
screen.key(["down"], () => { if(currentView === 'dashboard') logBox.scroll(1) });

connect();
logBox.log("{yellow-fg}Waiting for MACO Swarm activity...{/yellow-fg}");
requestRender();
