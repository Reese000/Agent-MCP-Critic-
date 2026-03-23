import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function checkProxyEnv() {
  const proxyKeys = Object.keys(process.env).filter((key) =>
    /^(?:HTTP|HTTPS|http|https|ALL|all)_PROXY$|^NO_PROXY$/i.test(key),
  );
  const active = proxyKeys
    .map((key) => ({ key, value: process.env[key] ?? "" }))
    .filter(({ value }) => value && value.trim().length > 0);

  if (active.length === 0) {
    console.log("[HEALTHCHECK] No explicit proxy environment variables detected.");
    return;
  }

  console.log("[HEALTHCHECK] Proxy environment variables detected:");
  active.forEach(({ key, value }) => {
    console.log(`- ${key}=${value}`);
  });

  const problematic = active.some(({ value }) => /127\.0\.0\.1:8080/i.test(value));
  assert(
    !problematic,
    "Detected localhost:8080 proxy configuration in environment; this is known to break MCP model calls.",
  );
}

async function checkCriticMcp() {
  const transport = new StdioClientTransport({
    command: "node",
    args: [path.join(__dirname, "../../dist/index.js")],
    env: {
      ...process.env,
      HTTP_PROXY: process.env.HTTP_PROXY ?? "",
      HTTPS_PROXY: process.env.HTTPS_PROXY ?? "",
      http_proxy: process.env.http_proxy ?? "",
      https_proxy: process.env.https_proxy ?? "",
    },
  });

  const client = new Client(
    {
      name: "critic-healthcheck",
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );

  try {
    await client.connect(transport);
    console.log("[HEALTHCHECK] Critic MCP transport connected.");

    const critique = await client.callTool({
      name: "get_critique",
      arguments: {
        user_request: "Health-check run. No production change. Verify MCP end-to-end transport.",
        work_done:
          "Executed a runtime health-check by calling get_critique with a minimal diff payload.",
        git_diff_output:
          "diff --git a/runtime_check.py b/runtime_check.py\nindex 1234567..89abcde 100644\n--- a/runtime_check.py\n+++ b/runtime_check.py\n@@ -1,2 +1,2 @@\n-print('old')\n+print('new')\n",
        raw_test_logs: `Smoke test run at ${new Date().toISOString()}`,
      },
    });

    const critiqueText = (critique.content?.[0] as any)?.text || "";
    assert(critiqueText.length > 0, "get_critique returned empty content.");
    console.log("[HEALTHCHECK] get_critique returned a response.");
  } finally {
    await client.close();
    await transport.close();
    console.log("[HEALTHCHECK] MCP transport closed.");
  }
}

async function main() {
  console.log("[HEALTHCHECK] Starting critic MCP health check...");
  checkProxyEnv();
  await checkCriticMcp();
  console.log("[HEALTHCHECK] PASS");
}

main().catch((err) => {
  console.error("[HEALTHCHECK] FAIL:", err instanceof Error ? err.message : err);
  process.exit(1);
});
