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

async function verifyContract() {
    if (!GEMINI_API_KEY) {
        console.error("API Key missing.");
        return;
    }

    const payload = {
        systemInstruction: { parts: [{ text: "You are a helpful assistant. Respond with 'ACK' if you receive this." }] },
        contents: [{ role: "user", parts: [{ text: "Hello" }] }]
    };

    try {
        console.log("Testing contract for 'gemini-2.5-flash'...");
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            payload,
            {
                headers: { "Content-Type": "application/json" },
                proxy: false,
            }
        );

        console.log("Status Code:", response.status);
        console.log("Response Data:", JSON.stringify(response.data.candidates[0], null, 2));
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            console.log("\nAPI Contract Verified: [SUCCESS]");
        } else {
            console.log("\nAPI Contract Verified: [FAILURE]");
        }

    } catch (error: any) {
        console.error("API Error:", error.response?.data?.error?.message || error.message);
        console.log("API Contract Verified: [FAILURE]");
    }
}

verifyContract();
