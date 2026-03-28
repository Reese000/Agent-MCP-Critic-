import { Blackboard } from "./src/Blackboard.js";

async function runFalsyTest() {
    console.log("=== [UNIT TEST: BLACKBOARD GET FALSY VALUE] ===");
    const bb = new Blackboard();
    const key = "test_zero";
    const expectedValue = 0;

    bb.set(key, expectedValue);
    
    // Original buggy implementation returns null for 0, false, or ""
    const retrievedValue = bb.get(key);

    if (retrievedValue === expectedValue) {
        console.log(`SUCCESS: get() correctly returned falsy value ${expectedValue}. Fix applied.`);
    } else if (retrievedValue === null) {
        console.log(`FAILURE: get() returned null for value ${expectedValue}. Bug persists.`);
    } else {
        throw new Error(`Unexpected return value: ${retrievedValue}`);
    }
    console.log("=== [FALSY TEST COMPLETE] ===");
}

runFalsyTest().catch(e => {
    console.error(e);
    process.exit(1);
});