/**
 * ModelManager.ts
 * Cost-sensitive model selection and context caching optimization logic.
 */

export interface ModelConfig {
    cheap: string;
    capable: string;
    reasoning: string;
}

const MODELS: ModelConfig = {
    // google/gemini-2.5-flash-lite for simple tasks
    cheap: process.env.CRITIC_SIMPLE_MODEL || "google/gemini-2.5-flash-lite-preview-09-2025",
    // MiniMax m2.7 for general purpose tasks
    capable: process.env.CRITIC_DEFAULT_MODEL || "minimax/minimax-m2.7",
    // Gemini 3.1 Pro Preview for ultra high reasoning tasks
    reasoning: process.env.CRITIC_HEAVY_MODEL || "google/gemini-3.1-pro-preview-09-2025"
};

export class ModelManager {
    /**
     * Resolves the best model for a given persona based on task complexity.
     * Prioritizes cost-savings for discovery/documentation roles.
     */
    static getModelForPersona(persona: string): string {
        const p = persona.toLowerCase();
        
        // Discovery and Documentation are low-complexity, high-volume: use Cheap
        if (p.includes("researcher") || p.includes("documenter") || p.includes("anti-bloat") || p.includes("ux_auditor")) {
            return MODELS.cheap;
        }

        // Orchestrators and Optimizers are high-complexity: use Reasoning
        if (p.includes("orchestrator") || p.includes("optimizer") || p.includes("architect")) {
            return MODELS.reasoning;
        }

        // Feature development and specialized testing: use Capable
        if (p.includes("developer") || p.includes("tester") || p.includes("error_fixer")) {
            return MODELS.capable;
        }

        // Default to cheap to avoid accidental oversized costs
        return MODELS.cheap;
    }

    /**
     * Standardizes the system prompt and conversation prefix to maximize
     * context caching hits on compatible providers (OpenRouter/Google).
     */
    static getCachingPrefix(persona: string, globalInstructions: string): string {
        // By ensuring the first N tokens are identical across turns, we maximize cache hits.
        return `[SYSTEM_ROLE: ${persona.toUpperCase()}]\n[GLOBAL_CONSTRAINTS]\n${globalInstructions}\n---`;
    }
}
