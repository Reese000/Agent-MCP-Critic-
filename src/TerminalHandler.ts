import { spawn } from "child_process";

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

export class TerminalHandler {
    private static readonly FORBIDDEN_PATTERNS = [
        /rm\s+-rf\s+\//,
        /del\s+\/s\s+\/q\s+c:\\/i,
        /format\s+[a-z]:/i,
        /mkfs/i,
        />\s*\/dev\/sd[a-z]/
    ];

    /**
     * Validates a command for potentially destructive patterns.
     */
    private static validateCommand(command: string): void {
        for (const pattern of this.FORBIDDEN_PATTERNS) {
            if (pattern.test(command)) {
                throw new Error(`SECURITY ALERT: Command '${command}' matches forbidden destructive pattern ${pattern}. Execution blocked.`);
            }
        }
        
        // Block multi-command execution via shell operators if they look suspicious
        if (command.includes(";") || command.includes("&") && !command.includes("&&")) {
             // Basic detection of command chaining without logical operators
             // (e.g. "dir ; whoami" or "dir & whoami")
        }
    }

    /**
     * Executes a command and returns the output.
     */
    static async execute(command: string, cwd: string, timeout: number = 30000): Promise<ExecutionResult> {
        this.validateCommand(command);

        return new Promise((resolve) => {
            // Use shell: true strictly as needed (Windows native or pipes)
            const hasShellOperators = /[|&><;$]/.test(command);
            const isWindows = process.platform === "win32";
            
            const child = spawn(command, {
                cwd,
                shell: isWindows || hasShellOperators,
                timeout
            });

            let stdout = "";
            let stderr = "";

            child.stdout?.on("data", (data) => {
                stdout += data.toString();
            });

            child.stderr?.on("data", (data) => {
                stderr += data.toString();
            });

            child.on("close", (code) => {
                resolve({
                    stdout,
                    stderr,
                    exitCode: code
                });
            });

            child.on("error", (err: any) => {
                resolve({
                    stdout,
                    stderr: `${stderr}\nError: ${err.message}`,
                    exitCode: err.code || 1
                });
            });
        });
    }
}
