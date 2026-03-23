# Agent-MCP-Critic Installation Guide

This guide provides a streamlined, hardened installation process for the Agent-MCP-Critic server.

## Prerequisites
- Node.js (v18+)
- npm
- A valid OpenRouter or Gemini API key

## Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Reese000/Agent-MCP-Critic- .
   npm install
   ```

2. **Configure Environment**:
   - Create a `.env` file based on `.env.example`.
   - Alternatively, run the migration script if upgrading from a legacy installation:
     ```bash
     node scripts/migrate_secrets.js
     ```

3. **Build the Server**:
   ```bash
   npm run build
   ```

4. **Verify Compliance**:
   Run the exhaustive compliance test to ensure the server is ready for Antigravity:
   ```bash
   npm run test
   ```

## Antigravity Configuration
Update your `mcp_config.json` with the following entry. **Note**: It is highly recommended to provide the API key directly in the `env` block for maximum reliability in daemon mode.

```json
"critic": {
  "command": "node",
  "args": ["C:/PATH/TO/REPO/dist/index.js"],
  "env": {
    "OPENROUTER_API_KEY": "YOUR_KEY_HERE"
  }
}
```

## Troubleshooting
- **Build Artifacts**: Ensure the `dist/` directory contains `index.js`.
- **Protocol Noise**: If you see JSON-RPC errors, verify that `ProtocolFilter` is active in `src/index.ts`.
- **Config Reload**: Antigravity requires a manual reload of the MCP configuration after editing `mcp_config.json`.
