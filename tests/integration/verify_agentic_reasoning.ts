import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const systemPrompt = `Role & Purpose:
You are the Critic Node in a strict Actor-Critic autonomous agent architecture. Your sole purpose is to audit and either approve or reject the work submitted.

Evaluation Criteria:
1. Proof of Work: Must have passing tests.
2. No Placeholders: No TODOs or abbreviated code.

Output Protocol:
[STATUS] (APPROVED/REJECTED)
[VIOLATIONS]
[CRITIQUE]
[REQUIRED ACTION]`;

async function testAgenticReasoning() {
    console.log("=== BEGIN AGENTIC REASONING TEST ===");
    console.log("Testing Grok 4.1 Fast on complex audit task...");

    const simulationInput = "The work is not finished. Verification is missing. Part 2 is not done.";

    try {
        const response = await axios.post(
            "https://openrouter.ai/ai/v1/chat/completions",
            {
                model: "x-ai/grok-4.1-fast",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Audit this: ${simulationInput}` }
                ],
            },
            {
                headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" }
            }
        );

        const content = response.data.choices[0].message.content;
        console.log("\nModel Response:\n", content);

        const hasRejected = content.includes("REJECTED");

        if (hasRejected) {
            console.log("\nAgentic Reasoning Test: [SUCCESS]");
        } else {
            console.log("\nAgentic Reasoning Test: [FAILURE]");
        }
    } catch (e: any) {
        console.error("Test Error:", e.message);
    }
}

testAgenticReasoning();
