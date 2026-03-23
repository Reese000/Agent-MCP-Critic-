import { telemetry } from "./Telemetry.js";

const COMPLIANCE_MARKER = "[ProtocolFilter] Noise diverted";

export class ProtocolFilter {
    private static originalStdoutWrite = process.stdout.write.bind(process.stdout);
    private static stdoutTarget: { write: Function } = process.stdout;
    private static stderrTarget: { write: Function } = process.stderr;
    private static isStarted = false;

    private static readonly JSONRPC_MARKER = '"jsonrpc"';
    private static readonly JSONRPC_VERSION = '"2.0"';
    private static readonly MAX_PARSE_SIZE = 65536; // 64KB security ceiling for validation

    static setTargets(stdout: { write: Function }, stderr: { write: Function }) {
        this.stdoutTarget = stdout;
        this.stderrTarget = stderr;
    }

    static start() {
        if (this.isStarted) return;
        this.isStarted = true;

        // Redirect all stderr noise to a filtered stream or suppress early logs
        console.error(COMPLIANCE_MARKER);

        // HIJACK STDOUT
        // @ts-ignore
        process.stdout.write = (chunk: any, encoding?: any, callback?: any) => {
            return this.filterAndDirect(chunk, encoding, callback);
        };
    }

    static filterAndDirect(chunk: any, encoding?: any, callback?: any): boolean {
        try {
            if (chunk === null || chunk === undefined) return true;

            let content: string;
            if (Buffer.isBuffer(chunk)) {
                content = chunk.toString();
            } else if (typeof chunk === 'string') {
                content = chunk;
            } else {
                return this.stderrTarget.write(chunk, encoding, callback);
            }

            const trimmed = content.trim();
            if (trimmed.length === 0) return this.stderrTarget.write(chunk, encoding, callback);

            // SECURITY CEILING: Don't parse massive chunks to avoid DoS
            if (content.length > this.MAX_PARSE_SIZE) {
                const head = `[ProtocolFilter] Skipping validation for large chunk (${content.length} bytes)\n`;
                this.stderrTarget.write(head);
                return this.stderrTarget.write(chunk, encoding, callback);
            }

            // STRICTER JSON-RPC DETECTION
            const hasRpcMarker = content.includes(this.JSONRPC_MARKER) && content.includes(this.JSONRPC_VERSION);
            const isJsonLike = trimmed.startsWith('{') || trimmed.startsWith('[');

            let isVerifiedRpc = false;
            if (isJsonLike && hasRpcMarker) {
                try {
                    const parsed = JSON.parse(trimmed);
                    const items = Array.isArray(parsed) ? parsed : [parsed];
                    isVerifiedRpc = items.length > 0 && items.every(item => 
                        item && typeof item === 'object' &&
                        item.jsonrpc === "2.0" && 
                        (item.method !== undefined || item.result !== undefined || item.error !== undefined)
                    );
                } catch (e) {
                    isVerifiedRpc = false;
                }
            }

            if (isVerifiedRpc) {
                // Determine if we are writing to real stdout or a redirected target
                const target = (this.stdoutTarget === process.stdout)
                    ? this.originalStdoutWrite
                    : this.stdoutTarget.write.bind(this.stdoutTarget);

                return target.call(this.stdoutTarget, chunk, encoding, callback);
            } else {
                // If it looks like it was trying to be an RPC but failed verification, log a security warning
                if (hasRpcMarker || isJsonLike) {
                    telemetry.sendLog(`[SECURITY] Potential protocol injection blocked: ${trimmed.substring(0, 100)}`, "warn");
                }
                
                const logHeader = `[ProtocolFilter] Noise diverted (${content.length} bytes)\n`;
                this.stderrTarget.write(logHeader);
                return this.stderrTarget.write(chunk, encoding, callback);
            }
        } catch (err) {
            const fatal = `[ProtocolFilter] FATAL: ${err instanceof Error ? err.message : String(err)}\n`;
            this.stderrTarget.write(fatal);
            return this.stderrTarget.write(chunk, encoding, callback);
        }
    }

    static stop() {
        if (!this.isStarted) return;
        process.stdout.write = this.originalStdoutWrite;
        this.isStarted = false;
    }
}
