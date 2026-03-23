import { FilesystemHandler } from "./FilesystemHandler.js";
import path from "path";

/**
 * Indexer.ts
 * Codebase indexing and fast-discovery tools to minimize token use during Wave 1.
 */

export class CodeIndexer {
    private static readonly EXCLUDED_DIRS = ["node_modules", ".git", "dist", "build", ".next", ".antigravity", "venv", "__pycache__"];
    private static readonly SUPPORTED_EXT = [".ts", ".js", ".py", ".md", ".tsx", ".jsx", ".pyi"];
    private static readonly MAX_FILE_SIZE_BYTES = 51200; // 50KB

    /**
     * Builds a condensed map of all file paths and their core function/class definitions.
     */
    static async buildMap(root: string): Promise<string> {
        const allFiles = await FilesystemHandler.search(root, ".*"); 
        
        // Filter out excluded directories and unsupported extensions
        const files = allFiles.filter(f => {
            const isExcluded = this.EXCLUDED_DIRS.some(d => f.includes(path.sep + d + path.sep) || f.endsWith(path.sep + d));
            const hasExt = this.SUPPORTED_EXT.includes(path.extname(f));
            return !isExcluded && hasExt;
        });

        let map = `CODEBASE SEMANTIC MAP: ${root}\n`;
        map += `Index Time: ${new Date().toISOString()}\n\n`;
        
        for (const file of files) {
            const relPath = path.relative(root, file).split(path.sep).join("/");
            console.error(`[INDEXER DEBUG] Processing ${relPath}`);
            
            try {
                const content = await FilesystemHandler.read(file);
                console.error(`[INDEXER DEBUG] ${relPath} size: ${content.length}`);
                if (content.length > CodeIndexer.MAX_FILE_SIZE_BYTES) {
                    console.error(`[INDEXER DEBUG] ${relPath} TOO LARGE, SKIPPING SYMBOLS`);
                    map += `- ${relPath}\n`;
                    map += `  [Symbols Skipped: File too large]\n`;
                    continue;
                }
                map += `- ${relPath}\n`;
                const lines = content.split("\n").slice(0, 300); 
                
                const symbols: string[] = [];
                const classRegex = /(?:export\s+)?class\s+(\w+)/g;
                const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g;
                const arrowRegex = /export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
                const pyDefRegex = /def\s+(\w+)\(/g;
                const pyClassRegex = /class\s+(\w+)(?:\(.*\))?:/g;

                const joined = lines.join("\n");
                let match;
                
                while ((match = classRegex.exec(joined)) !== null) symbols.push(`Class:${match[1]}`);
                while ((match = funcRegex.exec(joined)) !== null) symbols.push(`Func:${match[1]}`);
                while ((match = arrowRegex.exec(joined)) !== null) symbols.push(`Arrow:${match[1]}`);
                while ((match = pyDefRegex.exec(joined)) !== null) symbols.push(`def:${match[1]}`);
                while ((match = pyClassRegex.exec(joined)) !== null) symbols.push(`class:${match[1]}`);
                
                if (symbols.length > 0) {
                    const unique = Array.from(new Set(symbols));
                    map += `  Symbols: ${unique.join(", ")}\n`;
                }
            } catch (e: any) {
                console.warn(`[INDEXER WARNING] Failed to process ${relPath}: ${e.message}`);
                map += `  [Symbols Skipped: Read Error]\n`;
            }
        }
        
        return map;
    }

    /**
     * Fast-grep search across the indexed files to locate specific symbols or patterns.
     */
    static async semanticSearch(root: string, query: string): Promise<string> {
        const results = await FilesystemHandler.grep(root, query);
        let output = "";
        for (const [file, matches] of Object.entries(results)) {
            output += `FILE: ${file}\n${matches.join("\n")}\n\n`;
        }
        return output || "No matches found.";
    }
}
