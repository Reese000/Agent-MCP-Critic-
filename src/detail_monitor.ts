import { createRequire } from "module";
const require = createRequire(import.meta.url);
const blessed = require("blessed");
const contrib = require("blessed-contrib");
import net from "net";
import dotenv from "dotenv";

dotenv.config();

const screen = blessed.screen({
    smartCSR: true,
    title: "MACO Swarm - Live Agent Details",
    mouse: true,
    keys: true
});

const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });

// Map to store boxes/logs for each agent
const agentBoxes: Record<string, any> = {};
const agentData: Record<string, string> = {}; // Full accumulated text

const TELEMETRY_PORT = Number(process.env.MACO_TELEMETRY_PORT) || 3001;

function updateGridLayout() {
    const ids = Object.keys(agentBoxes);
    const count = ids.length;
    if (count === 0) return;

    // Calculate dynamic rows/cols
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    
    const rowHeight = Math.floor(12 / rows);
    const colWidth = Math.floor(12 / cols);

    ids.forEach((id, index) => {
        const r = Math.floor(index / cols) * rowHeight;
        const c = (index % cols) * colWidth;
        
        const box = agentBoxes[id];
        box.detach(); // Remove from current position
        
        // Re-position
        box.position.top = `${(r / 12) * 100}%`;
        box.position.left = `${(c / 12) * 100}%`;
        box.position.width = `${(colWidth / 12) * 100}%`;
        box.position.height = `${(rowHeight / 12) * 100}%`;
        
        screen.append(box);
    });
    screen.render();
}

function connect() {
    const client = net.createConnection({ port: TELEMETRY_PORT, host: "127.0.0.1" });

    client.on("connect", () => {
        screen.render();
    });

    let buffer = "";
    client.on("data", (data) => {
        buffer += data.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const raw = JSON.parse(line);

                if (raw.type === "agent_update") {
                    const id = raw.data.id;
                    if (!agentBoxes[id]) {
                        agentBoxes[id] = blessed.log({
                            label: ` AGENT: ${id.substring(0,8)} (${raw.data.persona.substring(0,15)}...) `,
                            border: "line",
                            style: { border: { fg: "cyan" } },
                            scrollable: true,
                            alwaysScroll: true,
                            scrollbar: { ch: " ", track: { bg: "grey" }, style: { inverse: true } }
                        });
                        agentData[id] = "";
                        updateGridLayout();
                    }
                }

                if (raw.type === "streaming_update") {
                    const { id, chunk } = raw.data;
                    if (agentBoxes[id]) {
                        agentBoxes[id].log(chunk);
                        agentData[id] += chunk;
                    }
                }
            } catch (e) {}
        }
    });

    client.on("close", () => setTimeout(connect, 3000));
    client.on("error", () => {});
}

screen.key(["escape", "q", "C-c"], () => process.exit(0));

connect();
screen.render();
