import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verifyOpenRouter() {
    console.log("=== OpenRouter API Contract Verification ===");
    const key = process.env.OPENROUTER_API_KEY;
    
    if (!key || !key.startsWith('sk-or-v1-')) {
        console.error("[FAIL] Invalid or missing OPENROUTER_API_KEY.");
        process.exit(1);
    }

    console.log("[INFO] Using key starting with: " + key.substring(0, 12) + "...");

    try {
        const response = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: {
                'Authorization': `Bearer ${key}`,
                'HTTP-Referer': 'https://github.com/Reese000/Agent-MCP-Critic-',
                'X-Title': 'Agent-MCP-Critic Verification'
            }
        });

        if (response.status === 200 && Array.isArray(response.data.data)) {
            console.log("[PASS] Successfully retrieved models from OpenRouter.");
            console.log("[INFO] Evidence: Found " + response.data.data.length + " models.");
            process.exit(0);
        } else {
            console.error("[FAIL] Unexpected response format from OpenRouter.");
            process.exit(1);
        }
    } catch (error) {
        console.error("[FAIL] API request failed: " + (error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
}

verifyOpenRouter();
