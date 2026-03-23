import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function verifyOpenRouter() {
    console.log("=== OpenRouter Connectivity Discovery ===");

    if (!OPENROUTER_API_KEY) {
        console.error("FAIL: OPENROUTER_API_KEY not found in .env");
        process.exit(1);
    }

    try {
        console.log("Checking API reachability...");
        const modelResponse = await axios.get("https://openrouter.ai/api/v1/models");
        console.log(`SUCCESS: Found ${modelResponse.data.data.length} models.`);

        const testModel = "google/gemma-3-27b-it:free";
        console.log(`\nAttempting "Cold-Start" completion with ${testModel}...`);

        const payload = {
            model: testModel,
            messages: [
                { role: "user", content: "Respond with exactly the word 'ACKNOWLEDGED' if you can read this." }
            ],
            temperature: 0,
        };

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            payload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                },
                timeout: 30000,
            }
        );

        const content = response.data?.choices?.[0]?.message?.content;
        console.log(`Response content: "${content}"`);

        if (content && content.includes("ACKNOWLEDGED")) {
            console.log("\nVERIFICATION SUCCESS: OpenRouter integration is functional.");
        } else {
            console.error("\nVERIFICATION FAILURE: Unexpected response content.");
            process.exit(1);
        }

    } catch (error: any) {
        console.error("\nFATAL ERROR during verification:");
        console.error(error.response?.data || error.message);
        process.exit(1);
    }
}

verifyOpenRouter();
