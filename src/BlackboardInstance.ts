import { Blackboard as BaseBlackboard } from "./Blackboard.js";
import { telemetry } from "./Telemetry.js";

/**
 * BlackboardInstance.ts
 * Singleton instance of the Blackboard, instrumented with Telemetry.
 */

class InstrumentedBlackboard extends BaseBlackboard {
    get<T = any>(key: string): T | null {
        const val = super.get<T>(key);
        telemetry.sendLog(`[BLACKBOARD] GET '${key}' ${val ? "(found)" : "(not found)"}`);
        return val;
    }

    set<T = any>(key: string, value: T): void {
        const isSystemKey = key.startsWith("_sys_");
        // Access control: only internal logic can set _sys keys
        // Since this is a programmatic check, we throw to signal invalid tool use
        if (isSystemKey) {
            throw new Error(`SECURITY VIOATION: Persistent system key '${key}' is read-only for sub-agents.`);
        }
        super.set(key, value);
        telemetry.sendBlackboardUpdate(key, JSON.stringify(value));
        telemetry.sendLog(`[BLACKBOARD] ${key} updated`);
    }

    async acquireLock(key: string, timeout?: number): Promise<boolean> {
        telemetry.sendLog(`[BLACKBOARD] Attempting lock for '${key}'`);
        const res = await super.acquireLock(key, timeout);
        if (res) {
            telemetry.sendLog(`[BLACKBOARD] Lock acquired for '${key}'`);
        } else {
            telemetry.sendLog(`[BLACKBOARD] Lock FAILED for '${key}'`, "error");
        }
        return res;
    }

    releaseLock(key: string): void {
        super.releaseLock(key);
        telemetry.sendLog(`[BLACKBOARD] Lock released for '${key}'`);
    }

    clear(): void {
        const all = this.getAll();
        const preserved: Record<string, any> = {};
        for (const key of Object.keys(all)) {
            if (key.startsWith("_sys_")) {
                preserved[key] = all[key];
            }
        }

        super.clear();

        // Restore preserved keys directly into the state to bypass the 'set' block
        for (const [key, value] of Object.entries(preserved)) {
            (this as any).state[key] = value;
        }

        telemetry.sendLog(`[BLACKBOARD] State cleared (System state preserved)`, "warn");
    }
}

export const blackboard = new InstrumentedBlackboard();
