import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const legacyPaths = [
    'C:/Users/Reese Chang/Desktop/Critic-MCP/.env',
    '../../Critic-MCP/.env',
    '../Critic-MCP/.env'
];

const targetEnv = path.join(__dirname, '..', '.env');

function migrate() {
    console.log("=== Agent-MCP-Critic Secret Migration ===");
    
    if (fs.existsSync(targetEnv)) {
        const current = fs.readFileSync(targetEnv, 'utf8');
        if (current.includes('sk-or-v1-')) {
            console.log("[SKIP] Valid key already detected in target .env.");
            return;
        }
    }

    for (const legacy of legacyPaths) {
        if (fs.existsSync(legacy)) {
            console.log(`[FOUND] Potential legacy .env discovered at: ${legacy}`);
            const content = fs.readFileSync(legacy, 'utf8');
            const lines = content.split('\n');
            const keyLine = lines.find(l => l.startsWith('OPENROUTER_API_KEY=sk-or-v1-'));
            
            if (keyLine) {
                console.log("[MIGRATE] Extracting OPENROUTER_API_KEY...");
                const key = keyLine.split('=')[1].trim();
                
                let finalContent = fs.existsSync(targetEnv) ? fs.readFileSync(targetEnv, 'utf8') : "";
                
                if (finalContent.includes('OPENROUTER_API_KEY=')) {
                    finalContent = finalContent.replace(/OPENROUTER_API_KEY=.*/, `OPENROUTER_API_KEY=${key}`);
                } else {
                    finalContent += `\nOPENROUTER_API_KEY=${key}\n`;
                }
                
                fs.writeFileSync(targetEnv, finalContent);
                console.log("[SUCCESS] Migrated legacy key to new .env.");
                return;
            }
        }
    }
    
    console.log("[INFO] No legacy keys found to migrate.");
}

migrate();
