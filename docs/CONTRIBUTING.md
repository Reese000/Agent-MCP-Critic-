# 🤝 Contributing to MACO Swarm

This guide explains how to extend the Multi-Agent Critic Orchestrator (MACO) with new agent personas and how to interact with the orchestration core.

## 🏗️ Adding New Personas

Agent personas are defined in `src/templates.ts`. To add a new persona:

1.  Open `src/templates.ts`.
2.  Add a new entry to the `personaTemplates` object.
3.  Define the persona's role, primary goals, and preferred tool-set.

Example:
```typescript
"security_auditor": "You are a professional security auditor. You focus on identifying vulnerabilities like unsanitized shell commands or path traversal. You use 'fs_grep' to scan for insecure patterns.",
```

## 📜 TOOL_USE_PROTOCOL

Agents in the swarm do not use JSON for tool-calling. Instead, they use a human-readable, high-visibility string format that is easier for smaller models to generate reliably.

### Format
`CALL: tool_name(arg1="value", arg2=123, arg3=true)`

### Rules
1. **Multi-line Strings**: Arguments can span multiple lines. The parser handles this using the `/s` regex flag.
2. **Escaping**: If your content contains double-quotes, you **must** escape them with a backslash: `content="console.log(\"Hello\")"`.
3. **Paths**: Use absolute paths or paths relative to the project root.

## 🧠 Using the Blackboard

The Blackboard is a thread-safe, in-memory state store. It is the primary way for agents in different waves to communicate.

- `bb_set(key="foo", value="bar")`: Stores data.
- `bb_get(key="foo")`: Retrieves data.

> [!TIP]
> Always save critical discovery results (like file paths or regex matches) to the blackboard so subsequent agents in the dependency chain can utilize them.
