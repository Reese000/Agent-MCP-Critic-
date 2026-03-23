# MACO System Shortcomings & Limitations

While the Multi-Agent Critic Orchestrator (MACO) is production-ready for complex autonomous development, several architectural and environmental ceilings remain.

## 1. Token Context "Bloom"
- **Issue**: Parallel swarms with high turn counts (3-5+ turns per persona) generate massive message histories. 
- **Shortcoming**: Agents can reach the LLM context window limit (e.g., 8k-32k tokens) during long-running tasks, potentially leading to truncation or "forgetting" early discovery.
- **Mitigation**: Implement a 'context summarization' persona to compress the history of completed waves.

## 2. Rate Limit Sensitivity
- **Issue**: High concurrency (>3-5 agents simultaneously calling the same model) can trigger HTTP 429 errors from API providers (OpenRouter/Google).
- **Shortcoming**: The orchestrator currently retries, but a massive surge can temporarily freeze the swarm execution.
- **Mitigation**: Implement a centralized RPM (Requests Per Minute) queue in the `callOpenRouterApi` function.

## 3. Terminal Interactivity
- **Issue**: `fs_execute` provides raw `stdout` and `stderr`.
- **Shortcoming**: It does not yet support interactive shell prompts (e.g., "Do you want to continue? [Y/n]"). If a command requires user input, it will hang until the timeout is reached.
- **Mitigation**: Use non-interactive flags (e.g., `npm install -y`) or implement a pseudo-terminal handler.

## 4. Cross-Project Relative Path Resolution
- **Issue**: When MACO is run on a target project outside its own root, relative paths can be ambiguous.
- **Shortcoming**: Agents sometimes attempt `./path` which resolves to the MACO root instead of the target project root.
- **Mitigation**: Hardened `TOOL_USE_PROTOCOL` instructions to always use absolute paths.

## 5. UI Latency
- **Issue**: The `blessed` dashboard relies on a TCP socket for updates.
- **Shortcoming**: Extremely rapid log bursts can cause a momentary "flicker" in the terminal UI during dashboard refreshes.
- **Mitigation**: Implement a debounced UI refresh logic (once per 100ms max).
