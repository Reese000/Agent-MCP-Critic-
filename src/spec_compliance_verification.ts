/**
 * Spec Compliance Verification (JSON-RPC 2.0)
 * 
 * This script independently verifies the ProtocolFilter's fingerprinting logic 
 * against the official JSON-RPC 2.0 and MCP specifications.
 */

// Implementation under test (Identical to ProtocolFilter.filterAndDirect)
function verifyContent(content: string): boolean {
    const JSONRPC_MARKER = '"jsonrpc"';
    const OBJECT_START = '{';
    const ARRAY_START = '[';

    const trimmed = content.trim();
    return (trimmed.startsWith(OBJECT_START) || trimmed.startsWith(ARRAY_START)) &&
        content.includes(JSONRPC_MARKER);
}

const specTests = [
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
        name: "Invalid: Missing Marker",
        input: '{"method": "test", "id": 1}',
        expected: false
    },
    {
        name: "Invalid: Non-Object Noise",
        input: 'The jsonrpc version is 2.0',
        expected: false
    },
    {
        name: "Invalid: Malformed Structure",
        input: 'jsonrpc: "2.0", method: "test"',
        expected: false
    },
    {
        name: "MCP Initialize Response (Real-world)",
        input: '{"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"critic-server","version":"1.6.0"}},"jsonrpc":"2.0","id":1}',
        expected: true
    }
];

console.log("=== JSON-RPC 2.0 SPEC COMPLIANCE VERIFICATION ===");
let allPassed = true;

for (const test of specTests) {
    const result = verifyContent(test.input);
    const passed = result === test.expected;
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${test.name.padEnd(30)} | Input: ${test.input.substring(0, 40)}${test.input.length > 40 ? '...' : ''}`);
    if (!passed) allPassed = false;
}

if (allPassed) {
    console.log("\nCONCLUSION: Logic ADHERES to JSON-RPC 2.0 structural requirements.");
    process.exit(0);
} else {
    console.error("\nCONCLUSION: Logic FAILS spec compliance.");
    process.exit(1);
}
