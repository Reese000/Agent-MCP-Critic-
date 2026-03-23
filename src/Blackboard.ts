

/**
 * Blackboard.ts
 * Centralized shared memory for multiple agents.
 * Enhanced with generics and concurrency control.
 */
export class Blackboard {
    private state: Record<string, any> = {};
    private locks: Set<string> = new Set();

    /**
     * Acquire a lock for a key to prevent race conditions during complex updates.
     */
    async acquireLock(key: string, timeout: number = 5000): Promise<boolean> {
        const start = Date.now();
        while (this.locks.has(key)) {
            if (Date.now() - start > timeout) {
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.locks.add(key);
        return true;
    }

    /**
     * Release a lock.
     */
    releaseLock(key: string): void {
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
        return val || null;
    }

    /**
     * Set a value on the blackboard.
     */
    set<T = any>(key: string, value: T): void {
        this.state[key] = value;
    }

    /**
     * Clear all state.
     */
    clear(): void {
        this.state = {};
        this.locks.clear();
    }

    /**
     * Get all keys.
     */
    getAll(): Record<string, any> {
        return { ...this.state };
    }
}
