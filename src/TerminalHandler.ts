import { exec, spawn } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface ExecutionResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

export class TerminalHandler {
    /**
     * Executes a command and returns the output.
     */
    static async execute(command: string, cwd: string, timeout: number = 30000): Promise<ExecutionResult> {
        return new Promise((resolve) => {
            const child = spawn(command, {
                cwd,
                shell: true,
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
