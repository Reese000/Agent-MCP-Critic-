import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function checkModel() {
    if (!OPENROUTER_API_KEY) {
        console.error("OPENROUTER_API_KEY not found.");
        return;
    }

    try {
        const response = await axios.get('https://openrouter.ai/api/v1/models');
        const models = response.data.data;
        const grokModels = models.filter((m: any) => m.id.toLowerCase().includes('grok'));

        console.log("Grok related models found:");
        grokModels.forEach((m: any) => {
            console.log(`- ${m.id} (Price: ${m.pricing.prompt} input, ${m.pricing.completion} output)`);
        });

        const targetModel = models.find((m: any) => m.id === 'x-ai/grok-4.1-fast');
        if (targetModel) {
            console.log("\nExact match 'x-ai/grok-4.1-fast' FOUND.");
        } else {
            console.log("\nExact match 'x-ai/grok-4.1-fast' NOT FOUND.");
        }
    } catch (e: any) {

        console.error("Error fetching models:", e.message);
    }
}

checkModel();
