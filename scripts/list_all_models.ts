import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, "../.env") });

async function test() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("API KEY MISSING");
        return;
    }

    const ai = new GoogleGenAI({ apiKey }) as any;

    try {
        console.log("Listing models...");
        const result = await ai.models.list();

        let models = [];
        if (result.pageInternal) {
            models = result.pageInternal;
        } else if (Array.isArray(result)) {
            models = result;
        } else {
            models = [result];
        }

        console.log(`Found ${models.length} models.`);
        models.forEach((m: any) => {
            console.log(`- ID: ${m.name} | Display: ${m.displayName}`);
        });

    } catch (e: any) {
        console.error("List failed:", e.message);
    }
}

test();
