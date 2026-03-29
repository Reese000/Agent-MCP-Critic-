import { spawn, ChildProcess } from 'child_process';

/**
 * Defines the structure for a single specification compliance test case.
 */
interface ISpecTest {
    name: string;
    input: string;
    expected: boolean;
}

/**
 * Defines the standardized result format for all verification methods.
 */
interface IVerificationResult {
    success: boolean;
    message: string;
    details?: any;
}

/**
 * Provides methods for verifying different aspects of the MCP server's correctness,
 * including specification compliance and basic startup functionality.
 * This class merges the logic from the original `spec_compliance_verification.ts`
 * and `standalone_verify.ts` scripts.
 */
export class VerificationService {

    /**
     * A suite of test cases to verify the JSON-RPC 2.0 fingerprinting logic.
     * These tests are derived from the official JSON-RPC 2.0 specification and
     * observed real-world messages.
     */
    private static readonly specTests: ISpecTest[] = [
        {
            name: "Standard Request",
            input: '{"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}',
            expected: true
        },
        {
            name: "Notification",
            input: '{"jsonrpc": "2.0", "method": "update", "params": [1,2,3,4,5]}',
            expected: true
        },
        {
            name: "Batch Request (Array)",
            input: '[{"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"},{"jsonrpc": "2.0", "method": "notify_hello", "params": [7]}]',
            expected: true
        },
        {
            name: "Indented Protocol Message",
            input: '   {"jsonrpc": "2.0", "method": "initialize", "id": 1}',
            expected: true
        },
        {
            name: "MCP Initialize Response (Real-world)",
            input: '{"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"critic-server","version":"1.6.0"}},"jsonrpc":"2.0","id":1}',
            expected: true
        },
        {
            name: "Invalid: Missing Marker",
            input: '{"method": "test", "id": 1}',
            expected: false
        },
        {
            name: "Invalid: Non-Object/Array Noise",
            input: 'The jsonrpc version is 2.0',
            expected: false
        },
        {
            name: "Invalid: Malformed Structure",
            input: 'jsonrpc: "2.0", method: "test"',
            expected: false
        },
    ];

    /**
     * Verifies if a string content adheres to the basic structure of a JSON-RPC 2.0 message.
     * This logic is identical to the fingerprinting method used in ProtocolFilter.
     * @param content The string content to verify.
     * @returns `true` if the content is likely a JSON-RPC message, otherwise `false`.
     */
    private verifyContent(content: string): boolean {
        const JSONRPC_MARKER = '"jsonrpc"';
        const OBJECT_START = '{';
        const ARRAY_START = '[';

        const trimmed = content.trim();
        return (trimmed.startsWith(OBJECT_START) || trimmed.startsWith(ARRAY_START)) &&
            content.includes(JSONRPC_MARKER);
    }

    /**
     * Runs the suite of spec compliance tests against the fingerprinting logic.
     * @returns An `IVerificationResult` object summarizing the test outcomes.
     */
    public runSpecComplianceCheck(): IVerificationResult {
        const testDetails: { name: string; passed: boolean; input: string }[] = [];
        let allPassed = true;

        for (const test of VerificationService.specTests) {
            const result = this.verifyContent(test.input);
            const passed = result === test.expected;
            if (!passed) allPassed = false;
            testDetails.push({ name: test.name, passed, input: test.input });
        }

        return {
            success: allPassed,
            message: allPassed
                ? "Fingerprinting logic adheres to JSON-RPC 2.0 structural requirements."
                : "Fingerprinting logic fails spec compliance.",
            details: testDetails
        };
    }

    /**
     * Verifies that the MCP server can be started as a child process and run
     * for a short period without crashing.
     * @param serverPath The absolute path to the compiled server's main JS file.
     * @param timeout How long to monitor the server process, in milliseconds.
     * @returns A Promise that resolves with an `IVerificationResult`.
     */
    public verifyServerStartup(serverPath: string, timeout: number = 3000): Promise<IVerificationResult> {
        return new Promise((resolve) => {
            let child: ChildProcess | null = null;
            try {
                child = spawn('node', [serverPath], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: { ...process.env, DEBUG: 'true' }
                });
            } catch (e: any) {
                resolve({
                    success: false,
                    message: `Failed to spawn server process: ${e.message}`,
                });
                return;
            }

            let outputReceived = false;
            let stderrOutput = '';

            const timer = setTimeout(() => {
                if (child) {
                    child.kill(); // Terminate the process after the timeout
                }
            }, timeout);

            child.on('error', (err) => {
                clearTimeout(timer);
                resolve({
                    success: false,
                    message: `Failed to start server process: ${err.message}`
                });
            });

            if (child.stdout) {
                child.stdout.on('data', () => {
                    outputReceived = true;
                });
            }

            if (child.stderr) {
                child.stderr.on('data', (data) => {
                    stderrOutput += data.toString();
                });
            }

            child.on('close', (code) => {
                clearTimeout(timer);
                // A null code means the process was killed by our timer, which is the expected "success" path.
                // A code of 0 would mean it exited cleanly on its own, which is also fine.
                if (code === null || code === 0) {
                    if (outputReceived) {
                        resolve({
                            success: true,
                            message: "Server started and produced output within the timeout period."
                        });
                    } else {
                        resolve({
                            success: true,
                            message: "Server ran for the timeout period without errors. No stdout was produced, which is acceptable for a server awaiting input."
                        });
                    }
                } else {
                    resolve({
                        success: false,
                        message: `Server process exited prematurely with error code ${code}.`,
                        details: `STDERR: ${stderrOutput.trim()}`
                    });
                }
            });
        });
    }
}
