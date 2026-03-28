# Lessons Learned - Agent MCP (critic)

### [2026-03-24] - Tool Stability and Large File Operations
- **Surgical Edits vs. Full Writes**: When modifying large files (>500 lines) with complex structures, `multi_replace_file_content` and even `replace_file_content` can occasionally fail due to shifting line numbers or inaccurate target content matching, leading to "mangled" files.
- **Justification**: In these scenarios, performed a full-file rewrite via `write_to_file` to ensure syntactic integrity and baseline stability. This was necessary to recover from two consecutive tool-induced corruptions of `src/index.ts`.

### [2026-03-27] - Swarm Protocol Enforcement and Agent Resilience
- **Critic Enforcement (Success)**: The `critic` server correctly blocked an `fs_write` operation when the agent tried to call it after a `REJECTED` critique status. This confirms that the Actor-Critic protocol is strictly enforced within the parallel orchestrator waves.
- **Agent Hallucinations on Failure**: Observed that when a tool call is denied by the enforcement layer, agents may attempt to "complete" the task by using other tools (e.g., `bb_get`) in erroneous ways and then clearing the blackboard to signal completion.
- **Tool Argument Confusion**: Multi-agent swarms sometimes confuse argument names between similar tools (e.g., using `path` instead of `key` for `bb_set`). Clearer persona instructions and tool schema descriptions are required to maintain stability.
- **Proof of Work Requirements**: The Critic is highly sensitive to "placeholder" descriptions. Successful filesystem modifications require detailed `work_done` summaries and valid git diff headers.
