import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function test() {
    const model = "meta-llama/llama-3.2-3b-instruct:free";
    try {
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: model,
                messages: [{ role: "user", content: "hi" }],
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                }
            }
        );
        console.log("Success:", response.data.choices[0].message.content);
    } catch (e: any) {
        console.error("Fail:", e.response?.data || e.message);
    }
}

test();
