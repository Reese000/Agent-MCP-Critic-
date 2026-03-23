interface ThrottlerItem {
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
}

export class Throttler {
    private queue: ThrottlerItem[] = [];
    private running = 0;
    private lastExecutionTime = 0;
    private maxRPM: number;
    private minIntervalMs: number;
    private isProcessing = false;

    constructor(maxRPM: number = 20) {
        this.maxRPM = maxRPM;
        this.minIntervalMs = 60000 / maxRPM;
    }

    /**
     * Executes a task, respecting the rate limit.
     */
    async throttle<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            if (!this.isProcessing) {
                this.isProcessing = true;
                this.processQueueLoop();
            }
        });
    }

    private async processQueueLoop() {
        while (this.queue.length > 0) {
            const now = Date.now();
            const timeSinceLast = now - this.lastExecutionTime;
            const waitTime = Math.max(0, this.minIntervalMs - timeSinceLast);

            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }

            const item = this.queue.shift();
            if (item) {
                this.running++;
                this.lastExecutionTime = Date.now();
                
                // Explicitly execute and settle the promise
                item.task()
                    .then(res => item.resolve(res))
                    .catch(err => item.reject(err))
                    .finally(() => {
                        this.running--;
                    });
            }
        }
        this.isProcessing = false;
    }
}

// Global instance for all orchestrator API calls - Claimed: 300 RPM
export const apiThrottler = new Throttler(300); 
