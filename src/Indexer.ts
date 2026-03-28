import { FilesystemHandler } from "./FilesystemHandler.js";
import fsPromises from "fs/promises";
import path from "path";

/**
 * Indexer.ts
 * Codebase indexing and fast-discovery tools to minimize token use during Wave 1.
 */

export class CodeIndexer {
    private static readonly EXCLUDED_DIRS = ["node_modules", ".git", "dist", "build", ".next", ".antigravity", "venv", "__pycache__"];
    private static readonly SUPPORTED_EXT = [".ts", ".js", ".py", ".md", ".tsx", ".jsx", ".pyi"];
    private static readonly MAX_FILE_SIZE_BYTES = 102400; // 100KB (Increased)

    /**
     * Builds a condensed map of all file paths and their core function/class definitions.
     */
    static async buildMap(root: string): Promise<string> {
        // Use the new hardened search
        const allFiles = await FilesystemHandler.search(root, "*"); 
        
        const files = allFiles.filter(f => {
            const relPath = path.relative(root, f);
            const isExcluded = this.EXCLUDED_DIRS.some(d => relPath.includes(path.sep + d + path.sep) || relPath.startsWith(d + path.sep) || relPath === d);
            const hasExt = this.SUPPORTED_EXT.includes(path.extname(f));
            return !isExcluded && hasExt;
        });

        let map = `CODEBASE SEMANTIC MAP: ${root}\n`;
        map += `Index Time: ${new Date().toISOString()}\n\n`;
        
        for (const file of files) {
            const relPath = path.relative(root, file).split(path.sep).join("/");
            
            try {
                const stats = await fsPromises.stat(file);
                if (stats.size > CodeIndexer.MAX_FILE_SIZE_BYTES) {
                    map += `- ${relPath} [Skipped: Large File - ${Math.round(stats.size/1024)}KB]\n`;
                    continue;
                }

                const content = await FilesystemHandler.read(file);
                map += `- ${relPath}\n`;
                
                const symbols: string[] = [];
                // Hardened Regexes
                const classRegex = /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/g;
                const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g;
                const arrowRegex = /export\s+const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;
                const pyDefRegex = /def\s+([a-zA-Z0-9_$]+)\(/g;
                const pyClassRegex = /class\s+([a-zA-Z0-9_$]+)(?:\(.*\))?:/g;

                // Only scan first 500 lines for efficiency, skipping extremely long minified lines
                const MAX_LINE_LENGTH = 1000;
                const scanContent = content.split("\n")
                    .slice(0, 500)
                    .filter(line => line.length < MAX_LINE_LENGTH)
                    .join("\n");
                
                let match;
                while ((match = classRegex.exec(scanContent)) !== null) symbols.push(`class ${match[1]}`);
                while ((match = funcRegex.exec(scanContent)) !== null) symbols.push(`func ${match[1]}`);
                while ((match = arrowRegex.exec(scanContent)) !== null) symbols.push(`const ${match[1]}`);
                while ((match = pyDefRegex.exec(scanContent)) !== null) symbols.push(`def ${match[1]}`);
                while ((match = pyClassRegex.exec(scanContent)) !== null) symbols.push(`cls ${match[1]}`);
                
                if (symbols.length > 0) {
                    const unique = Array.from(new Set(symbols));
                    map += `  Symbols: ${unique.join(", ")}\n`;
                }
            } catch (e: any) {
                map += `- ${relPath} [Skipped: Read Error]\n`;
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
            const relPath = path.relative(root, file).split(path.sep).join("/");
            output += `FILE: ${relPath}\n${matches.join("\n")}\n\n`;
        }
        return output || "No matches found.";
    }
}
