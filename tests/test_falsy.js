import { blackboard } from "../dist/BlackboardInstance.js";

async function testFalsy() {
    console.log("=== Testing Falsy Values ===");
    
    // Test 0
    blackboard.set("count", 0);
    const count = blackboard.get("count");
    console.log(`0 -> ${count} (${typeof count === 'number' ? 'PASS' : 'FAIL'})`);

    // Test false
    blackboard.set("flag", false);
    const flag = blackboard.get("flag");
    console.log(`false -> ${flag} (${typeof flag === 'boolean' ? 'PASS' : 'FAIL'})`);

    // Test empty string
    blackboard.set("msg", "");
    const msg = blackboard.get("msg");
    console.log(`"" -> "${msg}" (${typeof msg === 'string' ? 'PASS' : 'FAIL'})`);
}

testFalsy().catch(console.error);
