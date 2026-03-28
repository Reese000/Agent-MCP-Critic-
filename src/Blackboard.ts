

/**
 * Blackboard.ts
 * Centralized shared memory for multiple agents.
 * Enhanced with generics and concurrency control.
 */
export class Blackboard {
    private state: Record<string, any> = {};
    private locks: Map<string, Promise<void>> = new Map();
    private readonly PROTECTED_KEYS = new Set(["_sys_critique_status"]);

    /**
     * Internal-only set method (bypass protection)
     */
    private _forceSet(key: string, value: any): void {
        this.state[key] = value;
    }

    /**
     * Acquire a lock for a key to prevent race conditions during complex updates.
     * Uses a promise-based queue to ensure atomicity.
     */
    async acquireLock(key: string, timeout: number = 5000): Promise<boolean> {
        const start = Date.now();
        while (this.locks.has(key)) {
            if (Date.now() - start > timeout) {
                return false;
            }
            // Wait for the current holder of the lock to finish
            await Promise.race([
                this.locks.get(key),
                new Promise(resolve => setTimeout(resolve, 500)) // Poll every 500ms as a safety net
            ]);
        }
        
        // Create a new lock promise
        let release: () => void;
        const lockPromise = new Promise<void>(r => { release = r; });
        this.locks.set(key, lockPromise);
        (this as any)[`_rel_${key}`] = release!;
        
        return true;
    }

    /**
     * Release a lock.
     */
    releaseLock(key: string): void {
        const release = (this as any)[`_rel_${key}`];
        if (release) {
            release();
            delete (this as any)[`_rel_${key}`];
        }
        this.locks.delete(key);
    }

    /**
     * Executes a task within a locked context, guaranteeing release.
     */
    async runWithLock<T>(key: string, task: () => Promise<T>, timeout: number = 5000): Promise<T> {
        const acquired = await this.acquireLock(key, timeout);
        if (!acquired) {
            throw new Error(`LockTimeoutError: Failed to acquire lock for '${key}' after ${timeout}ms`);
        }
        try {
            return await task();
        } finally {
            this.releaseLock(key);
        }
    }

    /**
     * Get a value from the blackboard.
     */
    get<T = any>(key: string): T | null {
        const val = this.state[key] as T;
        return val ?? null;
    }

    /**
     * Set a value on the blackboard.
     */
    set<T = any>(key: string, value: T): void {
        if (this.PROTECTED_KEYS.has(key)) {
            throw new Error(`PERMITTED DENIED: Key '${key}' is protected. Use internal approval methods.`);
        }
        this.state[key] = value;
    }

    /**
     * Approve critique token.
     */
    approveCritique(): void {
        this._forceSet("_sys_critique_status", "APPROVED");
    }

    /**
     * Reject critique token.
     */
    rejectCritique(): void {
        this._forceSet("_sys_critique_status", "REJECTED");
    }

    /**
     * Clear all state (except protected protocol tokens)
     */
    clear(forceAll: boolean = false): void {
        const saved: Record<string, any> = {};
        if (!forceAll) {
            for (const key of this.PROTECTED_KEYS) {
                if (this.state[key]) saved[key] = this.state[key];
            }
        }
        this.state = saved;
        this.locks.clear();
    }

    /**
     * Prunes older wave summaries to prevent token bloat in long-running tasks.
     * Keeps only the last N summaries.
     */
    pruneSummaries(keepLast: number = 3): void {
        const keys = Object.keys(this.state)
            .filter(k => k.startsWith("wave_summary_"))
            .sort((a, b) => {
                const numA = parseInt(a.replace("wave_summary_", ""));
                const numB = parseInt(b.replace("wave_summary_", ""));
                return numA - numB;
            });

        if (keys.length > keepLast) {
            const toDelete = keys.slice(0, keys.length - keepLast);
            for (const key of toDelete) {
                delete this.state[key];
            }
        }
    }

    /**
     * Get all keys.
     */
    getAll(): Record<string, any> {
        return { ...this.state };
    }
}
