import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";
import readline from "readline";
import { blackboard } from "./BlackboardInstance.js";

export class FilesystemHandler {
    /**
     * List contents of a directory.
     */
    static isProtected(filePath: string): boolean {
        // [MASTER ORCHESTRATOR ENFORCEMENT]
        // If the Actor-Critic status is explicitly APPROVED, we allow system modifications.
        // This unblocks remediation swarms from fixing core vulnerabilities.
        if (blackboard.get("_sys_critique_status") === "APPROVED") {
            return false; 
        }

        const absPath = path.resolve(filePath);
        const cwd = process.cwd();
        const relPath = path.relative(cwd, absPath);
        
        // If it starts with '..' it's outside our current workspace. 
        if (relPath.startsWith('..') || path.isAbsolute(relPath)) return false;

        const normalized = relPath.toLowerCase();
        const parts = normalized.split(path.sep);
        
        // Protect source code, environment, and configuration within the workspace
        const protectedFolders = [
            "src", 
            "node_modules",
            ".git",
            ".antigravity",
            "dist"
        ];
        const protectedFiles = [
            ".env",
            "package.json",
            "tsconfig.json",
            "package-lock.json"
        ];

        // Check if any part of the path is a protected folder
        if (parts.some(p => protectedFolders.includes(p))) return true;
        
        // Check if the file itself is protected
        const fileName = path.basename(normalized);
        if (protectedFiles.includes(fileName)) return true;

        return false;
    }

    private static escapeRegex(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    static async list(dirPath: string) {
        try {
            const items = await fsPromises.readdir(dirPath, { withFileTypes: true });
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
            return await fsPromises.readFile(filePath, "utf-8");
        } catch (error: any) {
            throw new Error(`fs_read failed: ${error.message}`);
        }
    }

    /**
     * Write or append content to a file.
     */
    static async write(filePath: string, content: string, append: boolean = false) {
        if (this.isProtected(filePath)) {
            throw new Error(`PERMISSION DENIED: Path ${filePath} is protected from autonomous modification.`);
        }
        try {
            const dir = path.dirname(filePath);
            await fsPromises.mkdir(dir, { recursive: true });
            if (append) {
                await fsPromises.appendFile(filePath, content, "utf-8");
            } else {
                await fsPromises.writeFile(filePath, content, "utf-8");
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
            throw new Error(`PERMISSION DENIED: Path ${dirPath} is protected from autonomous modification.`);
        }
        try {
            await fsPromises.mkdir(dirPath, { recursive: true });
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
            throw new Error(`PERMISSION DENIED: Path ${targetPath} is protected from autonomous modification.`);
        }
        try {
            await fsPromises.rm(targetPath, { recursive: true, force: true });
            return `Successfully deleted ${targetPath}`;
        } catch (error: any) {
            throw new Error(`fs_delete failed: ${error.message}`);
        }
    }

    private static readonly EXCLUDED_DIRS = ["node_modules", ".git", "dist", "build", ".next", ".antigravity", "venv", "__pycache__"];
    private static readonly MAX_GREP_SIZE_BYTES = 10485760; // 10MB (Increased due to streaming)

    /**
     * Search for files matching a pattern (simplified glob).
     */
    static async search(dirPath: string, pattern: string): Promise<string[]> {
        try {
            const results: string[] = [];
            // Simplified glob to regex: escape everything except * and ?
            const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
            const regexStr = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
            const regex = new RegExp(`^${regexStr}$`, "i");
            
            const walk = async (currentDir: string) => {
                try {
                    const entries = await fsPromises.readdir(currentDir, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(currentDir, entry.name);
                        if (entry.isDirectory()) {
                            if (this.EXCLUDED_DIRS.includes(entry.name)) continue;
                            await walk(fullPath);
                        } else if (regex.test(entry.name)) {
                            results.push(fullPath);
                        }
                    }
                } catch (e: any) {
                    // Log permission issues but continue walking other branches
                    console.error(`[FS-WALK] Skipping ${currentDir}: ${e.message}`);
                }
            };
            
            await walk(dirPath);
            return results;
        } catch (error: any) {
            throw new Error(`fs_search failed: ${error.message}`);
        }
    }

    /**
     * Grep for content in files using streaming.
     */
    static async grep(dirPath: string, pattern: string): Promise<Record<string, string[]>> {
        try {
            const results: Record<string, string[]> = {};
            // Regex Hardening: Escape input pattern
            const escapedPattern = this.escapeRegex(pattern);
            const regex = new RegExp(escapedPattern, "i");
            
            const files = await this.search(dirPath, "*");
            // console.error(`[FS-GREP DEBUG] Files found: ${files.length}`);
            
            for (const file of files) {
                try {
                    const stats = await fsPromises.stat(file);
                    if (stats.size > this.MAX_GREP_SIZE_BYTES) continue;

                    const fileStream = fs.createReadStream(file);
                    const rl = readline.createInterface({
                        input: fileStream,
                        crlfDelay: Infinity
                    });

                    let lineNum = 0;
                    const matches: string[] = [];

                    for await (const line of rl) {
                        lineNum++;
                        if (regex.test(line)) {
                            matches.push(`L${lineNum}: ${line.trim()}`);
                        }
                        if (matches.length > 100) break; // Cap per-file matches
                    }

                    if (matches.length > 0) {
                        results[file] = matches;
                    }
                } catch (e) {
                    console.error(`[FS-GREP] Error reading file ${file}:`, e);
                    continue; // Skip failed files
                }
            }
            return results;
        } catch (error: any) {
            throw new Error(`fs_grep failed: ${error.message}`);
        }
    }
}
