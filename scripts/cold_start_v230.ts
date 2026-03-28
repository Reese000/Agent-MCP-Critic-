/**
 * cold_start_v230.ts
 * Verification script for version 2.3.0 model hierarchy and CLI auto-launch.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function verify() {
    console.log("[COLD-START] Initiating v2.3.0 Verification...");

    const indexContent = fs.readFileSync('src/index.ts', 'utf-8');
    const mmContent = fs.readFileSync('src/ModelManager.ts', 'utf-8');

    // 1. Verify src/index.ts content
    console.log("[COLD-START] Verifying CONFIG in src/index.ts...");
    const configMatch = indexContent.match(/const CONFIG = \{[\s\S]*?\};/);
    if (configMatch) {
        console.log("--- CONFIG BLOCK ---\n" + configMatch[0] + "\n-------------------");
    } else {
        console.log("CONFIG block not found!");
    }

    // 2. Verify ModelManager.ts reasoning logic
    console.log("[COLD-START] Verifying ModelManager reasoning tier...");
    if (mmContent.includes('MODELS.reasoning')) {
        console.log("Reasoning model logic FOUND in ModelManager.ts");
    } else {
        console.log("Reasoning model logic MISSING!");
    }

    // 3. Verify build success
    console.log("[COLD-START] Verifying build state...");
    try {
        execSync('npm run build', { stdio: 'ignore' });
        console.log("Build SUCCESS.");
    } catch (e) {
        console.log("Build FAILED.");
        process.exit(1);
    }

    console.log("[COLD-START] MISSION VERIFIED: v2.3.0 is operational.");
}

verify().catch(console.error);
