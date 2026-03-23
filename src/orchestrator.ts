import { ProtocolFilter } from "./ProtocolFilter.js";

// Absolute priority: Protect stdout
ProtocolFilter.start();

/**
 * The Circuit Breaker Orchestrator
 * Prevents "Death Spirals" where the Actor and Critic get stuck in a rejection loop.
 */
export class Orchestrator {
    private rejectionCount: number = 0;
    private readonly MAX_STRIKES: number = 3;

    constructor(private actorName: string = "Actor") { }

    /**
     * Process a critique result and manage the circuit breaker.
     */
    async processCritique(status: "APPROVED" | "REJECTED", critique: string): Promise<{ action: "CONTINUE" | "RECON_MODE" | "SUCCESS", message: string }> {
        if (status === "APPROVED") {
            this.rejectionCount = 0;
            return {
                action: "SUCCESS",
                message: "Critique APPROVED. Logic is sound."
            };
        }

        this.rejectionCount++;
        console.error(`[Orchestrator] Strike ${this.rejectionCount}/${this.MAX_STRIKES} for ${this.actorName}.`);

        if (this.rejectionCount >= this.MAX_STRIKES) {
            return {
                action: "RECON_MODE",
                message: `CRITICAL: Circuit Breaker Tripped. 3 consecutive rejections. Pivoting to Reconnaissance Mode to gather context.`
            };
        }

        return {
            action: "CONTINUE",
            message: `REJECTED. Actor must attempt a fix. Strikes remaining: ${this.MAX_STRIKES - this.rejectionCount}.`
        };
    }

    /**
     * Resets the circuit breaker if the task changes.
     */
    reset() {
        this.rejectionCount = 0;
    }
}

// Example usage / Simulation logic
async function runSimulation() {
    console.error("=== BEGIN CIRCUIT BREAKER SIMULATION ===");
    const orchestrator = new Orchestrator();

    const mockStrikes = [
        { status: "REJECTED" as const, critique: "Missing error handling." },
        { status: "REJECTED" as const, critique: "Still missing validation." },
        { status: "REJECTED" as const, critique: "Logic is still broken." },
    ];

    for (const strike of mockStrikes) {
        const result = await orchestrator.processCritique(strike.status, strike.critique);
        console.error(`Status: ${strike.status} | Action: ${result.action}`);
        console.error(`Message: ${result.message}\n`);

        if (result.action === "RECON_MODE") {
            console.error(">>> EXECUTION STOPPED. Actor forced to RECON MODE. <<<");
            break;
        }
    }
}

// Run simulation if executed directly
const isMain = process.argv[1] && (
    import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/')) ||
    process.argv[1].replace(/\\/g, '/').endsWith(import.meta.url.replace('file:///', ''))
);

if (isMain || process.env.RUN_SIM === 'true') {
    runSimulation().catch(console.error);
}
