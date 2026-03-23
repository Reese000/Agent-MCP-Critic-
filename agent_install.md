# AI Agent Installation Guide: Critic-MCP

This document provides a structured workflow for AI agents to install and configure the Critic-MCP server without human intervention.

## Mandatory Step 1: Baseline Verification
Before writing any configuration, verify the existing environment:
- Check for `node` and `npm` in PATH.
- Verify existing `package.json` scripts (`build`, `test`, `healthcheck`).

## Mandatory Step 2: Automated Healthcheck
Execute the `healthcheck_all.ps1` script. This script is designed to:
- Identify missing dependencies.
- Confirm build artifacts exist.
- Detect placeholder API keys in `.env`.
- **Output a valid MCP JSON-RPC configuration block.**

## Mandatory Step 3: API Verification (Violation 2 Prevention)
The `critic` server acts as a quality gate. It will reject submissions that do not verify API contracts.
- Read `api_verification.md` to understand the OpenRouter contract.
- If you are implementing new tools, create an isolated test script (e.g., `tests/verify_api.ts`) BEFORE integrating.

## Mandatory Step 4: Compliance Validation (Violation 5 Prevention)
Do not submit superficial test logs.
- Run `npm run test`.
- This executes an exhaustive compliance check (`src/test_compliance.ts`) that mocks JSON-RPC noise and verifies that stdout remains clean.
- Ensure the output contains `=== COMPLIANCE RESULT: SUCCESS ===`.

## Configuration Block Generation
The server should be integrated into `mcp_config.json` as follows (replace path with absolute path):
```json
{
  "mcpServers": {
    "critic": {
      "command": "node",
      "args": ["/path/to/Critic-MCP/dist/index.js"],
      "env": {}
    }
  }
}
```
