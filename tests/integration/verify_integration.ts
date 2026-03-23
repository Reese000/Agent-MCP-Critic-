import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Mock the CONFIG from src/index.ts
const CONFIG = {
    DEFAULT_MODEL: "x-ai/grok-4.1-fast",
};

async function testIntegration() {
    console.log("=== BEGIN INTEGRATION TEST ===");
    console.log(`Target Model: ${CONFIG.DEFAULT_MODEL}`);

    const payload = {
        model: CONFIG.DEFAULT_MODEL,
        messages: [
            { role: "system", content: "Identify your model name." },
            { role: "user", content: "Which model are you?" }
        ]
    };

    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            payload,
            {
                headers: {
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                }
            }
        );

        const content = response.data.choices[0].message.content;
        console.log("Model Response:", content);

        // Check if the response matches expected Grok behavior (optional, many models won't know their own ID)
        // But we can at least verify we sent the right model ID.
        console.log("Request Payload Model:", payload.model);

        if (response.status === 200) {
            console.log("Integration Check: [SUCCESS]");
        } else {
            console.log("Integration Check: [FAILURE]");
        }

    } catch (error: any) {
        console.error("Integration Error:", error.response?.data || error.message);
        process.exit(1);
    }
}

testIntegration();
