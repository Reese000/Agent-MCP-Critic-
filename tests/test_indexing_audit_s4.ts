import { CodeIndexer } from "../src/Indexer.js";
import path from "path";

/**
 * tests/test_indexing_audit_s4.ts
 * Verifies CodeIndexer performance and correctness on the MACO repository.
 */

async function runIndexingAudit() {
    console.log("=== [SECTION 4 AUDIT: INDEXING PERFORMANCE] ===");

    const root = process.cwd();
    console.log(`Auditing root: ${root}`);

    const start = Date.now();
    const map = await CodeIndexer.buildMap(root);
    const duration = Date.now() - start;

    console.log(`Indexing completed in ${duration}ms`);
    
    // Validations
    const lines = map.split("\n");
    console.log(`Generated Map size: ${lines.length} lines`);

    const hasNodeModules = map.includes("node_modules");
    const hasSrcFiles = map.includes("- src/index.ts");
    const hasIndexerSymbols = map.includes("Class:CodeIndexer");
    const hasThrottlerSymbols = map.includes("Class:Throttler");
    const hasPythonClass = map.includes("class:PythonAuditor");
    const hasPythonFunc = map.includes("def:standalone_python_func");
    const hasHugeFileSkip = map.includes("[Symbols Skipped: File too large (60KB)]");

    console.log(`- node_modules excluded: ${!hasNodeModules}`);
    console.log(`- src/index.ts found: ${hasSrcFiles}`);
    console.log(`- Python symbols found: ${hasPythonClass && hasPythonFunc}`);
    console.log(`- Huge file (>50KB) skipped correctly: ${hasHugeFileSkip}`);

    console.log("\n--- MAP PREVIEW ---");
    console.log(map.split("\n").slice(0, 70).join("\n"));
    console.log("... [TRUNCATED] ...");
    console.log("--- END PREVIEW ---\n");

    if (!hasNodeModules && hasSrcFiles && hasIndexerSymbols && hasPythonClass && hasPythonFunc && hasHugeFileSkip) {
        console.log("\nSUCCESS: Indexing is efficient, safe, and robust (Multi-language + Fail-safe).");
        process.exit(0);
    } else {
        console.error("\nFAILURE: Indexing criteria not met.");
        if (!hasHugeFileSkip) console.error("Error: Huge file was NOT skipped or incorrect log message.");
        process.exit(1);
    }
}

runIndexingAudit().catch(console.error);
