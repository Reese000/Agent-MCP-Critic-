import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    Tool,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { type AxiosRequestConfig } from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { ProtocolFilter } from "./ProtocolFilter.js";
import { getRefinedPersona } from "./PersonaOptimizer.js";
import { personaTemplates } from "./templates.js";
import { FilesystemHandler } from "./FilesystemHandler.js";
import { TerminalHandler } from "./TerminalHandler.js";
import { blackboard } from "./BlackboardInstance.js";
import { telemetry } from "./Telemetry.js";
import { ModelManager } from "./ModelManager.js";
import { CodeIndexer } from "./Indexer.js";
import { apiThrottler } from "./Throttler.js";
import { spawn } from "child_process";

// Absolute priority: Hijack stdout BEFORE any other imports or logic can print noise
ProtocolFilter.start();

try {
    // Robust .env resolution: Try CWD first (daemon/Antigravity style), 
    // then climb up from __dirname (dev/prod mirrored style)
    const findEnv = (startDir: string) => {
        let current = startDir;
        for (let i = 0; i < 4; i++) { // Up to 4 levels
            const p = path.join(current, ".env");
            const result = dotenv.config({ path: p });
            if (!result.error) {
                console.error(`[CRITIC-INIT] Loaded .env from: ${p}`);
                return true;
            }
            const parent = path.dirname(current);
            if (parent === current) break;
            current = parent;
        }
        return false;
    };

    if (!findEnv(process.cwd())) {
        if (!findEnv(__dirname)) {
            console.error("Warning: No .env file found via CWD or directory climbing.");
        }
    }
} catch (error) {
    console.error("Critical: Unexpected error during .env discovery:", error);
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const CONFIG = {
    DEFAULT_MODEL: "google/gemini-2.5-flash-lite-preview-09-2025",
    FALLBACK_MODEL: "gemini-flash-latest",
    OPENROUTER_FALLBACK: "google/gemini-2.0-flash-001",
    VERSION: "2.2.0",
    TIMEOUT_AGENT_TURN_MS: Number(process.env.TIMEOUT_AGENT_TURN_MS) || 60000,
    TIMEOUT_TOTAL_TASK_MS: Number(process.env.TIMEOUT_TOTAL_TASK_MS) || 300000
};

const HAS_UNAVAILABLE_LOCAL_PROXY = /(?:^|:\/\/)(?:127\.0\.0\.1|localhost):8080(?:$|[/?])/i.test(
    `${process.env.HTTP_PROXY || ""} ${process.env.HTTPS_PROXY || ""}`
);

if (HAS_UNAVAILABLE_LOCAL_PROXY) {
    console.error("[CRITIC-NET] Local proxy endpoint 127.0.0.1:8080 detected. Forcing direct API connectivity by disabling proxy for this process.");
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
    delete process.env.http_proxy;
    delete process.env.https_proxy;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`[TIMEOUT] ${errorMessage} after ${timeoutMs}ms`));
        }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]).finally(() => {
        if (timeoutId) clearTimeout(timeoutId);
    });
}

function buildRequestConfig(overrides: AxiosRequestConfig = {}): AxiosRequestConfig {
    const config: AxiosRequestConfig = {
        timeout: 45000,
    };
    if (HAS_UNAVAILABLE_LOCAL_PROXY) {
        config.proxy = false;
    }
    return { ...config, ...overrides };
}

if (!GEMINI_API_KEY) {
    console.error("Warning: GEMINI_API_KEY not found in environment.");
}
if (!OPENROUTER_API_KEY) {
    console.error("Warning: OPENROUTER_API_KEY not found in environment.");
}

// instrumented blackboard is now imported from BlackboardInstance.ts

const CRITIQUE_TOOL: Tool = {
    name: "get_critique",
    description: "Provides a critique of the work done by an AI agent using the Actor-Critic protocol.",
    inputSchema: {
        type: "object",
        properties: {
            user_request: {
                type: "string",
                description: "The original request or goal provided by the user.",
            },
            work_done: {
                type: "string",
                description: "A comprehensive summary of the actions taken and results achieved by the agent.",
            },
            git_diff_output: {
                type: "string",
                description: "Required: Raw git diff output of the code changes made.",
            },
            raw_test_logs: {
                type: "string",
                description: "Required: Raw terminal output from running the test suite.",
            },
            conversation_history: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        role: { type: "string", enum: ["user", "assistant", "system"] },
                        content: { type: "string" }
                    },
                    required: ["role", "content"]
                },
                description: "Optional conversation history for context-aware critiques.",
            }
        },
        required: ["user_request", "work_done", "git_diff_output", "raw_test_logs"],
    },
};

const AGENT_DEBATE_TOOL: Tool = {
    name: "agent_debate",
    description: "Orchestrates a debate between two AI agents on a given topic.",
    inputSchema: {
        type: "object",
        properties: {
            topic: { type: "string", description: "The main topic to debate." },
            position_a: { type: "string", description: "The position Agent A will defend." },
            position_b: { type: "string", description: "The position Agent B will defend." },
            max_turns: { type: "number", description: "Maximum number of conversational turns. Defaults to 3." }
        },
        required: ["topic", "position_a", "position_b"]
    }
};

const FS_LIST_TOOL: Tool = {
    name: "fs_list",
    description: "List contents of a local directory.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Absolute path to the directory." }
        },
        required: ["path"]
    }
};

const FS_READ_TOOL: Tool = {
    name: "fs_read",
    description: "Read the content of a local file.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Absolute path to the file." }
        },
        required: ["path"]
    }
};

const FS_WRITE_TOOL: Tool = {
    name: "fs_write",
    description: "Write or append content to a local file.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Absolute path to the file." },
            content: { type: "string", description: "Content to write." },
            append: { type: "boolean", description: "Optional: Whether to append. Defaults to false." }
        },
        required: ["path", "content"]
    }
};

const FS_MKDIR_TOOL: Tool = {
    name: "fs_mkdir",
    description: "Create a local directory.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Absolute path to the directory." }
        },
        required: ["path"]
    }
};

const FS_DELETE_TOOL: Tool = {
    name: "fs_delete",
    description: "Delete a local file or directory.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Absolute path to the target." }
        },
        required: ["path"]
    }
};

const FS_EXECUTE_TOOL: Tool = {
    name: "fs_execute",
    description: "Execute a shell command with a timeout. USE CAUTION.",
    inputSchema: {
        type: "object",
        properties: {
            command: { type: "string" },
            path: { type: "string" },
            timeout: { type: "number" }
        },
        required: ["command", "path"]
    }
};

const CODE_INDEX_TOOL: Tool = {
    name: "code_index",
    description: "Build a condensed map of all file paths and their core function/class definitions to minimize token use during discovery.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "The directory to index." }
        },
        required: ["path"]
    }
};

const CODE_SEARCH_TOOL: Tool = {
    name: "code_search",
    description: "Fast grep-based search across the codebase for specific symbols or patterns.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Root directory." },
            query: { type: "string", description: "Search term." }
        },
        required: ["path", "query"]
    }
};

const FS_SEARCH_TOOL: Tool = {
    name: "fs_search",
    description: "Search for files in a directory matching a pattern (e.g., *.ts).",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Absolute path to the search root." },
            pattern: { type: "string", description: "Search pattern (e.g., *.ts)." }
        },
        required: ["path", "pattern"]
    }
};

const FS_GREP_TOOL: Tool = {
    name: "fs_grep",
    description: "Search for a text pattern within all files in a directory.",
    inputSchema: {
        type: "object",
        properties: {
            path: { type: "string", description: "Absolute path to the search root." },
            pattern: { type: "string", description: "Text pattern to search for." }
        },
        required: ["path", "pattern"]
    }
};

const BB_GET_TOOL: Tool = {
    name: "bb_get",
    description: "Read a value from the shared blackboard (inter-agent memory).",
    inputSchema: {
        type: "object",
        properties: {
            key: { type: "string", description: "The key to look up." }
        },
        required: ["key"]
    }
};

const BB_SET_TOOL: Tool = {
    name: "bb_set",
    description: "Write a value to the shared blackboard (inter-agent memory).",
    inputSchema: {
        type: "object",
        properties: {
            key: { type: "string", description: "The key to set." },
            value: { type: "string", description: "The value to store." }
        },
        required: ["key", "value"]
    }
};

const BB_LIST_TOOL: Tool = {
    name: "bb_list",
    description: "List all keys and values currently stored on the shared blackboard (inter-agent memory).",
    inputSchema: {
        type: "object",
        properties: {}
    }
};

const BB_CLEAR_TOOL: Tool = {
    name: "bb_clear",
    description: "Delete all data from the shared blackboard.",
    inputSchema: {
        type: "object",
        properties: {}
    }
};

const PARALLEL_ORCHESTRATOR_TOOL: Tool = {
    name: "parallel_orchestrator",
    description: "Executes multiple compartmentalized tasks in parallel using customizable agent personas, a multi-turn tool-use loop, and an Actor-Critic optimization loop.",
    inputSchema: {
        type: "object",
        properties: {
            tasks: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "Unique identifier for the task." },
                        description: { type: "string", description: "Detailed description of the task to be performed." },
                        persona: { type: "string", description: "The persona or system prompt template to use." },
                        model: { type: "string", description: "Optional: Specific model to use for this task." },
                        max_turns: { type: "number", description: "Optional: Maximum tool-use turns for this agent. Defaults to 5." },
                        dependsOn: { type: "array", items: { type: "string" }, description: "Optional: IDs of tasks that must complete before this one starts." }
                    },
                    required: ["id", "description", "persona"]
                }
            },
            optimization_rounds: {
                type: "number",
                description: "Number of iterative refinement rounds for agent personas. Defaults to 0."
            },
            concurrency: {
                type: "number",
                description: "Maximum number of parallel API calls. Defaults to 3."
            }
        },
        required: ["tasks"]
    }
};

const server = new Server(
    {
        name: "critic-server",
        version: CONFIG.VERSION,
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
}

async function callGeminiApi(messages: Message[], model: string = CONFIG.FALLBACK_MODEL) {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY. Please check your .env file.");
    }

    try {
        const contents = messages
            .filter(m => m.role !== "system")
            .map(m => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }]
            }));

        const payload = {
            systemInstruction: { parts: [{ text: messages.find(m => m.role === "system")?.content || "" }] },
            contents: contents,
            generationConfig: { temperature: 0 }
        };

        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
            payload,
            buildRequestConfig({
                headers: { "Content-Type": "application/json" },
                validateStatus: (status: number) => status < 500, // Handle 4xx gracefully
            })
        );

        if (response.status !== 200) {
            const errorMsg = response.data?.error?.message || `HTTP ${response.status}`;
            throw new Error(`Gemini Error (${response.status}): ${errorMsg}`);
        }

        console.error(`[API VERIFICATION] Success: HTTP ${response.status} from Gemini using model ${model}`);

        const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            throw new Error(`Invalid response format from Gemini for model ${model}`);
        }

        return responseText;
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        console.error(`[CRITIC-DIAGNOSTIC] Gemini Failure (${model}):`, errorMessage);
        throw new Error(`Gemini Final Failure: ${errorMessage}`);
    }
}

async function callOpenRouterApi(messages: Message[], model: string = CONFIG.DEFAULT_MODEL) {
    if (!OPENROUTER_API_KEY) {
        throw new Error("Missing OPENROUTER_API_KEY. Please check your .env file.");
    }

    try {
        const payload = {
            model: model,
            messages: messages,
            temperature: 0,
        };

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            payload,
            buildRequestConfig({
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://github.com/GoogleCloudPlatform/mcp-server-critic",
                    "X-Title": "MCP Critic Server",
                },
            })
        );

        if (response.status !== 200) {
            const errorMsg = JSON.stringify(response.data?.error) || `HTTP ${response.status}`;
            throw new Error(`OpenRouter Error (${response.status}): ${errorMsg}`);
        }

        console.error(`[API VERIFICATION] Success: HTTP ${response.status} from OpenRouter using model ${model}`);

        const responseText = response.data?.choices?.[0]?.message?.content;
        if (!responseText) {
            throw new Error(`Invalid response format from OpenRouter for model ${model}`);
        }

        return responseText;
    } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || error.message;
        const fullError = JSON.stringify(error.response?.data || error.message, null, 2);
        console.error(`[CRITIC-DIAGNOSTIC] OpenRouter Failure (${model}): ${errorMessage}`);
        console.error(`[CRITIC-DIAGNOSTIC] Full Error Payload: ${fullError}`);

        // Fail-safe: Fallback within OpenRouter if primary fails
        if (model !== CONFIG.OPENROUTER_FALLBACK) {
            console.error(`[CRITIC-FAILSAFE] Redirecting to OpenRouter Fallback ${CONFIG.OPENROUTER_FALLBACK}...`);
            return callOpenRouterApi(messages, CONFIG.OPENROUTER_FALLBACK);
        }

        // Final fail-safe: Gemini is explicitly bypassed due to global billing quota exhaustion
        console.error(`[CRITIC-FAILSAFE] OpenRouter Fallback Failed. Gemini native fallback explicitly bypassed due to quota exhaustion.`);
        throw new Error(`OpenRouter Final Failure: ${errorMessage}`);
    }
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [CRITIQUE_TOOL, AGENT_DEBATE_TOOL, PARALLEL_ORCHESTRATOR_TOOL, FS_LIST_TOOL, FS_READ_TOOL, FS_WRITE_TOOL, FS_MKDIR_TOOL, FS_DELETE_TOOL, BB_GET_TOOL, BB_SET_TOOL, BB_LIST_TOOL, BB_CLEAR_TOOL, FS_SEARCH_TOOL, FS_GREP_TOOL, FS_EXECUTE_TOOL, CODE_INDEX_TOOL, CODE_SEARCH_TOOL],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "agent_debate") {
        interface AgentDebateArgs {
            topic: string;
            position_a: string;
            position_b: string;
            max_turns?: number;
        }
        const { topic, position_a, position_b, max_turns = 3 } = request.params.arguments as unknown as AgentDebateArgs;

        // Explicitly enforce Nitro tier, discarding any downstream requested models.
        const debateModel = CONFIG.DEFAULT_MODEL;

        let transcript = `DEBATE TOPIC: ${topic}\n\n`;
        let historyA: Message[] = [{ role: "system", content: `You are Agent A. Defend this position strictly: ${position_a}. The topic is: ${topic}. Be concise, articulate, and try to dismantle the opponent's argument. If you physically cannot defend it anymore, output <concede>.` }];
        let historyB: Message[] = [{ role: "system", content: `You are Agent B. Defend this position strictly: ${position_b}. The topic is: ${topic}. Be concise, articulate, and try to dismantle the opponent's argument. If you physically cannot defend it anymore, output <concede>.` }];

        try {
            let lastMessage = "";
            for (let i = 0; i < max_turns; i++) {
                // Agent A Turn
                historyA.push({ role: "user", content: i === 0 ? "Begin your opening argument." : `Agent B argued: "${lastMessage}". Counter it.` });
                const replyA = await callOpenRouterApi(historyA, debateModel);
                transcript += `**Agent A (Turn ${i + 1})**:\n${replyA}\n\n`;
                historyA.push({ role: "assistant", content: replyA });
                if (replyA.includes("<concede>")) break;
                lastMessage = replyA;

                // Agent B Turn
                historyB.push({ role: "user", content: `Agent A argued: "${lastMessage}". Counter it.` });
                const replyB = await callOpenRouterApi(historyB, debateModel);
                transcript += `**Agent B (Turn ${i + 1})**:\n${replyB}\n\n`;
                historyB.push({ role: "assistant", content: replyB });
                if (replyB.includes("<concede>")) break;
                lastMessage = replyB;
            }

            // Summarizer
            const summaryPrompt: Message[] = [{
                role: "system",
                content: "You are a debate summarizer. Review the debate transcript and generate a final conclusion document highlighting the main points touched on in the debate by both sides and any relevant insights. Be balanced and concise."
            }, {
                role: "user",
                content: transcript
            }];

            const summary = await callOpenRouterApi(summaryPrompt, CONFIG.DEFAULT_MODEL);
            const finalDocument = `# Debate Summary: ${topic}\n\n## Transcript\n${transcript}\n## Conclusion\n${summary}`;

            return {
                content: [{ type: "text", text: finalDocument }]
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Debate execution failed: ${error.message}` }],
                isError: true
            };
        }
    }
    if (request.params.name === "parallel_orchestrator") {
        interface OrchestatorTask {
            id: string;
            description: string;
            persona: string;
            model?: string;
            max_turns?: number;
            dependsOn?: string[];
        }
        interface ParallelOrchestratorArgs {
            tasks: OrchestatorTask[];
            optimization_rounds?: number;
            concurrency?: number;
        }
        const { tasks, optimization_rounds = 0, concurrency = 3 } = request.params.arguments as unknown as ParallelOrchestratorArgs;

        const results: Record<string, { output: string; persona: string; logs: string[] }> = {};

        // Helper to resolve persona
        const resolvePersona = (p: string) => {
            const base = personaTemplates[p] || p;
            const bbState = JSON.stringify(blackboard.getAll());
            return `${base}\n\nTOOL_USE_PROTOCOL: You can interact with the local filesystem and the shared Blackboard. You MUST use the following format for tool calls:\nCALL: tool_name(arg1="val1", arg2="val2")\n\nBLACKBOARD STATE: ${bbState}\n\nRULES:\n1. Only use ONE 'CALL:' per message.\n2. Always wait for the TOOL_RESULT before making your next call.\n3. Wrap all string arguments in double quotes.\n4. When using 'bb_set', describe the discovery so other agents know what happened.\n\nAVAILABLE TOOLS:\n- fs_list(path="...")\n- fs_read(path="...")\n- fs_write(path="...", content="...", [append=true])\n- fs_mkdir(path="...")\n- fs_delete(path="...")\n- fs_search(path="...", pattern="...")\n- fs_grep(path="...", pattern="...")\n- fs_execute(command="...", path="...", [timeout=30000])\n- bb_get(key="...")\n- bb_set(key="...", value="...")\n- bb_list()\n- bb_clear()`;
        };

        const runTool = async (name: string, args: any) => {
            console.error(`[ORCHESTRATOR] Executing Local Tool: ${name} with args:`, args);

            // Normalize path-like arguments
            const normalizedPath = args.path || args.file_path || args.filepath || args.target;
            const normalizedContent = args.content || args.data || args.text;

            switch (name) {
                case "fs_list":
                    if (!normalizedPath) throw new Error("Missing 'path' argument for fs_list.");
                    return JSON.stringify(await FilesystemHandler.list(normalizedPath));
                case "fs_read":
                    if (!normalizedPath) throw new Error("Missing 'path' argument for fs_read.");
                    return await FilesystemHandler.read(normalizedPath);
                case "fs_write":
                    if (!normalizedPath || normalizedContent === undefined) throw new Error("Missing 'path' or 'content' argument for fs_write.");
                    // Enforcement Layer Check
                    if (blackboard.get("_sys_critique_status") !== "APPROVED") {
                        throw new Error("PROTOCOL VIOLATION: fs_write denied. No 'APPROVED' critique found in system state. You MUST call get_critique and receive approval before modifying the filesystem.");
                    }
                    return await FilesystemHandler.write(normalizedPath, normalizedContent, !!args.append);
                case "fs_mkdir":
                    if (!normalizedPath) throw new Error("Missing 'path' argument for fs_mkdir.");
                    return await FilesystemHandler.mkdir(normalizedPath);
                case "fs_delete":
                    if (!normalizedPath) throw new Error("Missing 'path' argument for fs_delete.");
                    // Enforcement Layer Check
                    if (blackboard.get("_sys_critique_status") !== "APPROVED") {
                        throw new Error("PROTOCOL VIOLATION: fs_delete denied. No 'APPROVED' critique found in system state. You MUST call get_critique and receive approval before deleting files.");
                    }
                    return await FilesystemHandler.delete(normalizedPath);
                case "bb_get":
                    if (!args.key) throw new Error("Missing 'key' argument for bb_get.");
                    return blackboard.get(args.key) || "Key not found.";
                case "bb_set":
                    if (!args.key || args.value === undefined) throw new Error("Missing 'key' or 'value' argument for bb_set.");
                    blackboard.set(args.key, args.value);
                    return `Successfully set ${args.key} on blackboard.`;
                case "bb_list":
                    return JSON.stringify(blackboard.getAll(), null, 2);
                case "bb_clear":
                    blackboard.clear();
                    return "Blackboard cleared.";
                case "code_index":
                    const normalizedIndexPath = path.isAbsolute(args.path) ? args.path : path.join(process.cwd(), args.path);
                    return await CodeIndexer.buildMap(normalizedIndexPath);
                case "code_search":
                    const normalizedSearchPath = path.isAbsolute(args.path) ? args.path : path.join(process.cwd(), args.path);
                    return JSON.stringify(await CodeIndexer.semanticSearch(normalizedSearchPath, args.query));
                case "fs_search":
                    if (!normalizedPath || !args.pattern) throw new Error("Missing 'path' or 'pattern' argument for fs_search.");
                    return JSON.stringify(await FilesystemHandler.search(normalizedPath, args.pattern));
                case "fs_grep":
                    if (!normalizedPath || !args.pattern) throw new Error("Missing 'path' or 'pattern' argument for fs_grep.");
                    return JSON.stringify(await FilesystemHandler.grep(normalizedPath, args.pattern));
                case "fs_execute":
                    if (!args.command || !normalizedPath) throw new Error("Missing 'command' or 'path' argument for fs_execute.");
                    // Enforcement Layer Check
                    if (blackboard.get("_sys_critique_status") !== "APPROVED") {
                        throw new Error("PROTOCOL VIOLATION: fs_execute denied. No 'APPROVED' critique found in system state. You MUST call get_critique and receive approval before executing commands.");
                    }
                    const execRes = await TerminalHandler.execute(args.command, normalizedPath, args.timeout);
                    return `EXIT CODE: ${execRes.exitCode}\nSTDOUT:\n${execRes.stdout}\nSTDERR:\n${execRes.stderr}`;
                default: throw new Error(`Unknown local tool: ${name}`);
            }
        };

        // Dependency Resolution (Waves)
        const waves: OrchestatorTask[][] = [];
        const completed = new Set<string>();
        let remaining = [...tasks];

        while (remaining.length > 0) {
            const nextWave = remaining.filter(t => !t.dependsOn || t.dependsOn.every(d => completed.has(d)));
            if (nextWave.length === 0) throw new Error("Circular dependency detected in tasks.");
            waves.push(nextWave);
            nextWave.forEach(t => completed.add(t.id));
            remaining = remaining.filter(t => !nextWave.includes(t));
        }

        console.error(`[ORCHESTRATOR] Resolved into ${waves.length} waves.`);

        for (const wave of waves) {
            console.error(`[ORCHESTRATOR] Executing Wave (Batch size: ${concurrency})`);
            for (let i = 0; i < wave.length; i += concurrency) {
                const batch = wave.slice(i, i + concurrency);
                await Promise.all(batch.map(async (task) => {
                    await withTimeout(
                        (async () => {
                            const messages: Message[] = [{ role: "system", content: resolvePersona(task.persona) }];

                            // PHASE 9: Context Injection (Provide summaries of previous waves)
                            let previousSummaries = "";
                            for (const key of Object.keys(blackboard.getAll())) {
                                if (key.startsWith("wave_summary_")) {
                                    previousSummaries += `[SUMMARY: ${key.toUpperCase()}]\n${blackboard.get(key)}\n\n`;
                                }
                            }

                            const taskPrompt = previousSummaries
                                ? `CONSOLIDATED PREVIOUS WORK:\n${previousSummaries}\n---\nCURRENT TASK: ${task.description}\nExecute the required tool calls to complete this objective.`
                                : `Your task: ${task.description}\nExecute the required tool calls to complete this objective.`;

                            messages.push({ role: "user", content: taskPrompt });

                            const logs: string[] = [];
                            let turn = 0;
                            const maxTurns = task.max_turns || 5;

                            while (turn < maxTurns) {
                                telemetry.sendAgentUpdate({
                                    id: task.id,
                                    persona: task.persona,
                                    status: "reasoning",
                                    turnCount: turn,
                                    startTime: Date.now()
                                });

                                // Cost-Sensitive Model Switching with Rate Limiting (Throttler)
                                const model = task.model || ModelManager.getModelForPersona(task.persona);
                                const resText = await withTimeout(
                                    apiThrottler.throttle(() => callOpenRouterApi(messages, model)),
                                    CONFIG.TIMEOUT_AGENT_TURN_MS,
                                    `Agent ${task.id} turn ${turn} (Model: ${model})`
                                );

                                // Extract thinking blocks for transparency
                                const thoughtMatch = resText.match(/<thinking>([\s\S]*?)<\/thinking>/i);
                                if (thoughtMatch) {
                                    const thoughts = thoughtMatch[1].trim();
                                    const thoughtKey = `thought_${task.id}_turn_${turn}`;
                                    blackboard.set(thoughtKey, thoughts);
                                    logs.push(`[THINKING] Captured to blackboard key: ${thoughtKey}`);
                                }

                                messages.push({ role: "assistant", content: resText });
                                logs.push(`Agent Output: ${resText.substring(0, 200)}...`);

                                // Robust Regex for CALL: tool_name(...) - with /s flag for multi-line
                                const toolMatch = resText.match(/CALL: (\w+)\s*\((.*)\)/s);
                                if (toolMatch) {
                                    const name = toolMatch[1];
                                    const argString = toolMatch[2] || "";

                                    let args: any = {};
                                    // Sophisticated parser for key="value" that handles escaped quotes
                                    const argRegex = /(\w+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\d+)|(true|false))/g;
                                    let m;
                                    while ((m = argRegex.exec(argString)) !== null) {
                                        const key = m[1];
                                        let val: any = m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : (m[4] !== undefined ? Number(m[4]) : m[5] === "true"));

                                        // Unescape quotes if it was a string
                                        if (typeof val === 'string') {
                                            val = val.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, '\n');
                                        }
                                        args[key] = val;
                                    }

                                    try {
                                        telemetry.sendAgentUpdate({
                                            id: task.id,
                                            persona: task.persona,
                                            status: "executing",
                                            lastTool: name,
                                            turnCount: turn,
                                            startTime: Date.now()
                                        });

                                        const toolResult = await runTool(name, args);
                                        telemetry.sendLog(`[${task.id}] Tool ${name} Success`);
                                        messages.push({ role: "user", content: `TOOL_RESULT: ${toolResult}` });
                                        logs.push(`Tool ${name} Result: ${toolResult.substring(0, 500)}...`);
                                    } catch (e: any) {
                                        telemetry.sendLog(`[${task.id}] Tool ${name} ERROR: ${e.message}`, "error");
                                        messages.push({ role: "user", content: `TOOL_ERROR: ${e.message}` });
                                        logs.push(`Tool ${name} Error: ${e.message}`);
                                    }
                                } else {
                                    break; // Done or no tool called
                                }
                                turn++;
                            }
                            results[task.id] = { output: messages[messages.length - 1].content, persona: task.persona, logs };
                        })(),
                        CONFIG.TIMEOUT_TOTAL_TASK_MS,
                        `Global Task execution for agent ${task.id}`
                    );
                }));
            }

            // PHASE 9: Wave Summarization (Condense results of the wave to prevent token bloat)
            const completedWaveTasks = wave;
            if (completedWaveTasks.length >= 1) {
                const summaryPersona = personaTemplates.documenter + "\nYou are a concise summarizer. Extract only the key technical findings, file paths, and facts from the following task results. Output a single paragraph of pure fact.";
                const waveSummaryPrompt = `Wave Tasks:\n${completedWaveTasks.map(t => `${t.id}: ${t.description}`).join("\n")}\n\nResults:\n${completedWaveTasks.map(t => JSON.stringify(results[t.id])).join("\n\n")}`;

                try {
                    const summary = await apiThrottler.throttle(() => callOpenRouterApi([
                        { role: "system", content: summaryPersona },
                        { role: "user", content: waveSummaryPrompt }
                    ], ModelManager.getModelForPersona("researcher")));

                    const currentWaveIndex = waves.indexOf(wave);
                    blackboard.set(`wave_summary_${currentWaveIndex}`, summary);
                    telemetry.sendLog(`[SUMMARIZER] Wave ${currentWaveIndex} results condensed.`);
                } catch (e: any) {
                    telemetry.sendLog(`[SUMMARIZER] Failed to condense wave: ${e.message}`, "warn");
                }
            }
        }

        return {
            content: [{ type: "text", text: JSON.stringify(results, null, 2) }]
        };
    }

    if (request.params.name === "get_critique") {

        interface CritiqueArgs {
            user_request: string;
            work_done: string;
            git_diff_output: string;
            raw_test_logs: string;
            conversation_history?: Message[];
        }

        const {
            user_request,
            work_done,
            git_diff_output,
            raw_test_logs,
            conversation_history = [],
        } = request.params.arguments as unknown as CritiqueArgs;

        // Explicitly enforce Nitro tier, discarding any downstream requested models.
        const critiqueModel = CONFIG.DEFAULT_MODEL;

        // Input Validation
        if (!user_request || user_request.trim().length < 10) {
            return {
                content: [{ type: "text", text: "Error: user_request must be at least 10 characters long." }],
                isError: true,
            };
        }
        if (!work_done || work_done.trim().length < 20) {
            return {
                content: [{ type: "text", text: "Error: work_done must be at least 20 characters long." }],
                isError: true,
            };
        }
        // Strict Regex Validation for legitimate Git diff structures to completely eliminate spoofed hallucinatory payloads
        const hasValidHunkHeader = /@@ -\d+(,\d+)? \+\d+(,\d+)? @@/.test(git_diff_output);
        const hasValidGitHeader = /^diff --git a\/.* b\/.*/m.test(git_diff_output);
        const hasValidIndexHeader = /^index [0-9a-f]+\.\.[0-9a-f]+/m.test(git_diff_output);

        if (!git_diff_output || (!hasValidHunkHeader && !hasValidGitHeader && !hasValidIndexHeader)) {
            return {
                content: [{ type: "text", text: "Error: git_diff_output must strictly contain valid structural regex markers (e.g., '@@ -x,y +x,y @@' or 'diff --git a/b/'). Human visual output explicitly prevented via machine-readable headless JSON-RPC mapping." }],
                isError: true,
            };
        }
        if (!raw_test_logs || raw_test_logs.trim().length <= 4) {
            return {
                content: [{ type: "text", text: "Error: raw_test_logs is strictly required. The string must contain at least 5 characters of raw terminal test logs." }],
                isError: true,
            };
        }

        // Zero-Cost Deterministic Pre-Filters
        const lazyKeywords = ["REDACTED_T_O_D_O", "REDACTED_F_I_X_M_E", "(dots)"];
        const textToScan = [work_done, git_diff_output, raw_test_logs].join(" ");

        for (const keyword of lazyKeywords) {
            if (textToScan.includes(keyword)) {
                const preFilterRejection = `[STATUS]\nREJECTED\n\n[VIOLATIONS]\n4\n\n[CRITIQUE]\nZero-cost pre-filter triggered. The submission contains a forbidden quality marker: "${keyword}".`;
                return {
                    content: [{ type: "text", text: preFilterRejection }],
                };
            }
        }

        const systemPrompt = `Role & Purpose:
You are the Critic Node in a strict Actor-Critic autonomous agent architecture. You do not write new features, and you do not execute primary tasks. Your sole purpose is to audit, verify, and either approve or reject the work submitted by the Actor agent. You are the final quality control gate.

Operating Stance:
You must be ruthless, analytical, and strictly bound by the rules. You do not give the Actor the benefit of the doubt. If a submission violates even a single constraint, or if the logic is flawed, you must reject it. "Plausible deniability," assumptions, and unverified code are critical failures.

Evaluation Criteria (The Audit Checklist):
Whenever the Actor submits code, system designs, or test outputs, you must evaluate them against these exact parameters:

1. The "Read Before Write" Check: Did the Actor prove that they investigated the existing codebase before writing this solution? Reject if the code duplicates existing functionality.
2. The API Verification Check: Does the code rely on third-party APIs or external libraries? If yes, did the Actor provide proof (via documentation fetches or isolated test scripts) that the API contract is correct? Reject any assumed or "guessed" endpoints.
3. The High-Visibility Check: Does the proposed solution rely on a GUI or require human visual intervention? Reject it. The solution must be 100% headless, CLI-driven, or API-based with robust logging.
4. The Production-Ready Check: Scan the submitted code for placeholders, unfinished labels, abbreviated logic, or incomplete error handling. Reject if any are found.
5. The Proof of Work Check: Did the Actor submit a passing test output alongside their code? Does the test actually validate the specific logic they just wrote, or is it a superficial test? Reject if the test fails, is missing, or does not adequately cover the new logic.
6. The "Cold-Start" Proof Check: Did the Actor submit raw terminal output (stdout/stderr) proving they executed the script end-to-end exactly as a human user would? Reject the work immediately if the Actor only ran unit tests, used mocked data, or failed to provide raw execution logs. The code must survive contact with the real environment.
7. The "Value-Add" Quality Check: Did the Actor do the bare minimum? Review the code for anticipatory engineering. If the Actor did not include robust error handling, graceful fail states, input validation, or helpful logging in addition to the core requested feature, you must reject it. Punish lazy, bare-minimum coding.

Output Protocol:
You must format your response strictly using the following structure. Do not use conversational filler.

<thinking>
[Step-by-step evaluation of each of the 7 criteria against the submission]
</thinking>

[STATUS]
Output exactly either "APPROVED" or "REJECTED".

[VIOLATIONS]
If REJECTED, list the exact Evaluation Criteria number(s) that failed.
If APPROVED, output "None."

[CRITIQUE]
Provide a concise, blunt explanation of exactly what failed and why. Point to specific lines of code or specific logical leaps.

[REQUIRED ACTION]
Tell the Actor exactly what they must do to fix the failure before resubmitting. Do not write the code for them; tell them the logical or procedural steps they missed.`;

        const prompt = `
User Original Request:
${user_request}

Work Done by Agent:
${work_done}

Git Diff Output (Evidence):
${git_diff_output || "Not provided."}

Raw Test Logs (Evidence):
${raw_test_logs || "Not provided."}

Please provide your critique based on the above information.
`;

        const messages: Message[] = [
            { role: "system", content: systemPrompt }
        ];
        for (const msg of conversation_history) {
            messages.push(msg);
        }
        messages.push({ role: "user", content: prompt });

        try {
            const critique = await callOpenRouterApi(messages, CONFIG.DEFAULT_MODEL);

            // Enforcement Layer: Scan for [STATUS] APPROVED
            if (critique.includes("[STATUS]") && critique.includes("APPROVED")) {
                // Use internal state setter to bypass sub-agent forgery protection
                (blackboard as any).state["_sys_critique_status"] = "APPROVED";
                telemetry.sendLog("[CRITIC] Approval registered in system state.");
            } else {
                (blackboard as any).state["_sys_critique_status"] = "REJECTED";
                telemetry.sendLog("[CRITIC] Work REJECTED. Sensitive tools locked.", "warn");
            }

            return {
                content: [{ type: "text", text: critique }],
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }

    throw new Error(`Unknown tool: ${request.params.name}`);
});

async function main() {
    const transport = new StdioServerTransport();

    // Auto-launch Swarm Monitor Dashboard
    if (process.env.MACO_MONITOR !== "false") {
        console.error("[MONITOR] Launching Swarm Dashboard...");
        const monitorPath = path.join(__dirname, "monitor.js");
        // Use 'start cmd /c' for maximum compatibility on Windows if wt is not installed
        spawn("cmd", ["/c", "start", "node", monitorPath], {
            detached: true,
            stdio: "ignore",
            shell: true
        }).unref();

        telemetry.sendLog("MACO Swarm Monitor initialized");
    }

    await server.connect(transport);
    console.error("Critic MCP Server running on stdio (Filtered)");
}

main().catch((error) => {
    console.error("Fatal Error:", error);
    process.exit(1);
});
