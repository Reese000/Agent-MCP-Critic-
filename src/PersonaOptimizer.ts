import { Message } from "./index.js";
import { personaTemplates } from "./templates.js";

export async function getRefinedPersona(
    taskDescription: string,
    currentPersona: string,
    output: string,
    taskLogs: string[],
    callModel: (messages: Message[]) => Promise<string>
): Promise<string> {
    const optimizerSystemPrompt = personaTemplates.meta_optimizer;
    
    const prompt = `
Task Description: ${taskDescription}
Current Persona: ${currentPersona}
Execution Logs:
${taskLogs.join("\n")}

Output Produced:
---
${output}
---

Review the output and the execution logs against the task description. 
Identify where the agent could have performed better, especially regarding tool-calling syntax and filesystem logic.
Then, provide a NEW, REFINED persona (system prompt) that will help the agent succeed in a follow-up attempt. 
Your response should ONLY be the new persona string.
`;

    const messages: Message[] = [
        { role: "system", content: optimizerSystemPrompt },
        { role: "user", content: prompt }
    ];

    try {
        const refinedPersona = await callModel(messages);
        return refinedPersona.trim();
    } catch (error) {
        console.error("Persona Optimization failed, falling back to current persona:", error);
        return currentPersona;
    }
}
