import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function getChatProof() {
    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "openrouter/free",
                messages: [{ role: "user", content: "Say 'Success'" }],
                temperature: 0
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://github.com/GoogleCloudPlatform/mcp-server-critic",
                    "X-Title": "MCP Critic Server Proof",
                }
            }
        );
        console.log("=== RAW CHAT COMPLETION PROOF ===");
        console.log(JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        console.error("Chat completion proof failed:", error.response?.data || error.message);
    }
}

getChatProof();
