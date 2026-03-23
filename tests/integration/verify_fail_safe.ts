import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCAL_PROXY_PATTERN = /(?:^|:\/\/)(?:127\.0\.0\.1|localhost):8080(?:$|[/?])/i;
if (LOCAL_PROXY_PATTERN.test(`${process.env.HTTP_PROXY || ""} ${process.env.HTTPS_PROXY || ""}`)) {
    process.env.HTTP_PROXY = "";
    process.env.HTTPS_PROXY = "";
    process.env.http_proxy = "";
    process.env.https_proxy = "";
}

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const CONFIG = {
    DEFAULT_MODEL: "gemini-2.5-flash",
    FALLBACK_MODEL: "gemini-2.0-flash-lite",
};

async function callGeminiApi(messages: any[], model: string = CONFIG.DEFAULT_MODEL): Promise<string> {
    try {
        const payload = {
            contents: [{ role: "user", parts: [{ text: messages[0]?.content || "test" }] }]
        };

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            payload,
            {
                headers: { "Content-Type": "application/json" },
                timeout: 10000,
                validateStatus: (status) => status < 500,
                proxy: false,
            }
        );

        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}: ${response.data?.error?.message || 'Error'}`);
        }

        return response.data.candidates[0].content.parts[0].text;
    } catch (error: any) {
        console.log(`[TEST-LOG] Caught expected error for ${model}: ${error.message}`);
        if (model !== CONFIG.FALLBACK_MODEL) {
            console.log(`[TEST-LOG] Triggering fail-safe fallback to ${CONFIG.FALLBACK_MODEL}...`);
            return callGeminiApi(messages, CONFIG.FALLBACK_MODEL);
        }
        throw error;
    }
}

async function runErrorTests() {
    console.log("=== BEGIN ERROR HANDLING & FAIL-SAFE TEST ===");

    // Test 1: Invalid Model (Should Fallback)
    console.log("\nScenario 1: Invalid Model ID");
    try {
        const result = await callGeminiApi([{ role: "user", content: "ping" }], "invalid-model-id-12345");
        console.log("Result after fallback:", result.substring(0, 50) + "...");
        console.log("Scenario 1: [SUCCESS] - Fallback worked.");
    } catch (e: any) {
        console.log("Scenario 1: [FAILURE] - Fallback failed.");
    }
}

runErrorTests();
