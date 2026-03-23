import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function verifyContracts() {
    console.log("=== API Contract Verification ===");

    // 1. Gemini Contract
    console.log("\n[1/2] Verifying Gemini API Contract...");
    const geminiPayload = {
        systemInstruction: { parts: [{ text: "You are a helpful assistant." }] },
        contents: [{ role: "user", parts: [{ text: "Respond with 'GEMINI_OK'" }] }],
    };
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            geminiPayload
        );
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        console.log(`Gemini response: ${text?.trim()}`);
        if (text?.includes("GEMINI_OK")) console.log("SUCCESS: Gemini Contract Verified.");
    } catch (e: any) {
        console.error("Gemini Failure:", e.response?.data || e.message);
    }

    // 2. OpenRouter Contract
    console.log("\n[2/2] Verifying OpenRouter API Contract...");
    const orPayload = {
        model: "meta-llama/llama-3.2-3b-instruct:free",
        messages: [{ role: "user", content: "Respond with 'OR_OK'" }],
    };
    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            orPayload,
            { headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}` } }
        );
        const text = response.data?.choices?.[0]?.message?.content;
        console.log(`OpenRouter response: ${text?.trim()}`);
        if (text?.includes("OR_OK")) console.log("SUCCESS: OpenRouter Contract Verified.");
    } catch (e: any) {
        console.error("OpenRouter Failure:", e.response?.data || e.message);
    }
}

verifyContracts();
