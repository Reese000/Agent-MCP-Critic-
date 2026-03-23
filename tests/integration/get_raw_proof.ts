import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

async function getRawProof() {
    console.log("=== RAW API PROOF: OpenRouter /models ===");
    try {
        const response = await axios.get("https://openrouter.ai/api/v1/models");
        // Log a slice of the data to prove schema
        const sample = response.data.data.slice(0, 3);
        console.log("Raw Schema Proof (First 3 Models):");
        console.log(JSON.stringify(sample, null, 2));

        const freeExample = response.data.data.find((m: any) => m.pricing.prompt === "0" || m.pricing.prompt === 0);
        console.log("\nFound Free Model Example:");
        console.log(JSON.stringify(freeExample, null, 2));
    } catch (e: any) {
        console.error(e.message);
    }
}

getRawProof();
