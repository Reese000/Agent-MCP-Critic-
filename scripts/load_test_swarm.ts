import net from "net";
import dotenv from "dotenv";

dotenv.config();

const PORT = 3001;
const HOST = '127.0.0.1';
const AGENT_COUNT = 20;
const PACKET_INTERVAL_MS = 100;

console.log(`[LOAD-TEST] Starting Swarm Simulation with ${AGENT_COUNT} agents...`);
console.log(`[LOAD-TEST] Target: ${HOST}:${PORT}`);

/**
 * Simulates a single agent's life cycle and telemetry stream.
 */
async function simulateAgent(id: number) {
    const client = new net.Socket();
    const agentName = `Ghost_${id.toString().padStart(2, '0')}`;

    const connect = () => {
        return new Promise<void>((resolve, reject) => {
            client.connect(PORT, HOST, () => {
                console.log(`[${agentName}] Connected.`);
                resolve();
            });
            client.on('error', (err) => {
                console.error(`[${agentName}] Connection Error: ${err.message}`);
                reject(err);
            });
        });
    };

    try {
        await connect();

        // Initial Registration
        client.write(JSON.stringify({
            type: 'agent_start',
            agentId: agentName,
            timestamp: new Date().toISOString()
        }) + '\n');

        // Continuous Telemetry Stream
        let step = 0;
        const interval = setInterval(() => {
            step++;
            const statuses = ['Processing', 'Thinking', 'ToolUse', 'Validating'];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            const packet = {
                type: 'agent_update',
                agentId: agentName,
                status: status,
                step: step,
                task: `Ghost Task ${step}`,
                timestamp: new Date().toISOString()
            };

            if (!client.destroyed) {
                client.write(JSON.stringify(packet) + '\n');
            } else {
                clearInterval(interval);
            }

            // Occasionally send a log message
            if (step % 5 === 0) {
                client.write(JSON.stringify({
                    type: 'log',
                    agentId: agentName,
                    message: `Ghost heartbeat at step ${step}`,
                    level: 'info'
                }) + '\n');
            }

            // Stop after 20 steps
            if (step >= 20) {
                clearInterval(interval);
                client.write(JSON.stringify({
                    type: 'agent_stop',
                    data: { id: agentName, timestamp: Date.now() }
                }) + '\n');
                console.log(`[${agentName}] Task complete. Sent agent_stop.`);
                setTimeout(() => client.destroy(), 1000);
            }

        }, PACKET_INTERVAL_MS);

        client.on('close', () => {
            console.log(`[${agentName}] Connection closed.`);
            clearInterval(interval);
        });

    } catch (e) {
        console.error(`[${agentName}] Simulation aborted.`);
    }
}

// Launch Swarm
for (let i = 1; i <= AGENT_COUNT; i++) {
    simulateAgent(i);
}

process.on('SIGINT', () => {
    console.log("[LOAD-TEST] Stopping simulation...");
    process.exit(0);
});
