import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function troubleshoot() {
    console.log("--- CRITIC MCP TROUBLESHOOTING REPORT ---");
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // 1. Environment Check
    const envPath = path.join(process.cwd(), ".env");
    const envExists = fs.existsSync(envPath);
    console.log(`[ENV] .env file found at ${envPath}: ${envExists ? "YES" : "NO"}`);

    if (envExists) {
        dotenv.config({ path: envPath });
    } else {
        // Try parent
        dotenv.config();
    }

    // 2. API Keys Check
    const geminiKey = process.env.GEMINI_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    console.log(`[KEYS] GEMINI_API_KEY: ${geminiKey ? "Set (Length: " + geminiKey.length + ")" : "MISSING"}`);
    console.log(`[KEYS] OPENROUTER_API_KEY: ${openrouterKey ? "Set (Length: " + openrouterKey.length + ")" : "MISSING"}`);

    // 3. Connectivity Pings
    console.log("[NET] Testing connectivity to API endpoints...");
    
    try {
        const geminiStart = Date.now();
        await axios.get("https://generativelanguage.googleapis.com/", { timeout: 5000 });
        console.log(`[NET] Google Gemini API reachable (${Date.now() - geminiStart}ms)`);
    } catch (e: any) {
        console.log(`[NET] Google Gemini API unreachable or returned error: ${e.message}`);
    }

    try {
        const orStart = Date.now();
        await axios.get("https://openrouter.ai/api/v1/models", { timeout: 5000 });
        console.log(`[NET] OpenRouter API reachable (${Date.now() - orStart}ms)`);
    } catch (e: any) {
        console.log(`[NET] OpenRouter API unreachable or returned error: ${e.message}`);
    }

    // 4. Config Check
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
        console.log(`[PKG] Server Version: ${pkg.version}`);
    }

    console.log("--- END OF REPORT ---");
    
    if (!geminiKey && !openrouterKey) {
        console.error("CRITICAL ERROR: No API keys configured. The server will not function.");
        process.exit(1);
    }
}

troubleshoot().catch(err => {
    console.error("Troubleshooting failed:", err);
    process.exit(1);
});
