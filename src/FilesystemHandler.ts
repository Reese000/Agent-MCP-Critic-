import fs from "fs/promises";
import path from "path";

export class FilesystemHandler {
    /**
     * List contents of a directory.
     */
    static isProtected(filePath: string): boolean {
        const normalized = path.normalize(filePath).toLowerCase();
        // Protect source code, environment, and configuration
        const protectedPatterns = [
            "src", 
            ".env", 
            "package.json", 
            "tsconfig.json", 
            "node_modules",
            ".git",
            ".antigravity",
            "package-lock.json"
        ];
        return protectedPatterns.some(p => normalized.includes(p.toLowerCase()));
    }

    static async list(dirPath: string) {
        try {
            const items = await fs.readdir(dirPath, { withFileTypes: true });
            return items.map(item => ({
                name: item.name,
                type: item.isDirectory() ? "directory" : "file"
            }));
        } catch (error: any) {
            throw new Error(`fs_list failed: ${error.message}`);
        }
    }

    /**
     * Read content of a file.
     */
    static async read(filePath: string) {
        try {
            return await fs.readFile(filePath, "utf-8");
        } catch (error: any) {
            throw new Error(`fs_read failed: ${error.message}`);
        }
    }

    /**
     * Write or append content to a file.
     */
    static async write(filePath: string, content: string, append: boolean = false) {
        if (this.isProtected(filePath)) {
            throw new Error(`PERMITTED DENIED: Path ${filePath} is protected from autonomous modification.`);
        }
        try {
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            if (append) {
                await fs.appendFile(filePath, content, "utf-8");
            } else {
                await fs.writeFile(filePath, content, "utf-8");
            }
            return `Successfully ${append ? "appended to" : "wrote to"} ${filePath}`;
        } catch (error: any) {
            throw new Error(`fs_write failed: ${error.message}`);
        }
    }

    /**
     * Create a directory.
     */
    static async mkdir(dirPath: string) {
        if (this.isProtected(dirPath)) {
            throw new Error(`PERMITTED DENIED: Path ${dirPath} is protected from autonomous modification.`);
        }
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return `Successfully created directory ${dirPath}`;
        } catch (error: any) {
            throw new Error(`fs_mkdir failed: ${error.message}`);
        }
    }

    /**
     * Delete a file or directory.
     */
    static async delete(targetPath: string) {
        if (this.isProtected(targetPath)) {
            throw new Error(`PERMITTED DENIED: Path ${targetPath} is protected from autonomous modification.`);
        }
        try {
            await fs.rm(targetPath, { recursive: true, force: true });
            return `Successfully deleted ${targetPath}`;
        } catch (error: any) {
            throw new Error(`fs_delete failed: ${error.message}`);
        }
    }

    /**
     * Search for files matching a pattern (simplified glob).
     */
    static async search(dirPath: string, pattern: string): Promise<string[]> {
        try {
            const results: string[] = [];
            const regex = new RegExp(pattern.replace(/\*/g, ".*").replace(/\?/g, "."), "i");
            
            async function walk(currentDir: string) {
                const entries = await fs.readdir(currentDir, { withFileTypes: true });
                for (const entry of entries) {
                    const fullPath = path.join(currentDir, entry.name);
                    if (entry.isDirectory()) {
                        await walk(fullPath);
                    } else if (regex.test(entry.name)) {
                        results.push(fullPath);
                    }
                }
            }
            
            await walk(dirPath);
            return results;
        } catch (error: any) {
            throw new Error(`fs_search failed: ${error.message}`);
        }
    }

    /**
     * Grep for content in files.
     */
    static async grep(dirPath: string, pattern: string): Promise<Record<string, string[]>> {
        try {
            const results: Record<string, string[]> = {};
            const regex = new RegExp(pattern, "i");
            const files = await this.search(dirPath, ".*");
            
            for (const file of files) {
                const content = await fs.readFile(file, "utf-8");
                const matches = content.split("\n")
                    .map((line, i) => ({ line, num: i + 1 }))
                    .filter(item => regex.test(item.line))
                    .map(item => `L${item.num}: ${item.line.trim()}`);
                
                if (matches.length > 0) {
                    results[file] = matches;
                }
            }
            return results;
        } catch (error: any) {
            throw new Error(`fs_grep failed: ${error.message}`);
        }
    }
}
