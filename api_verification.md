# OpenRouter API Contract Verification

## Endpoint
`POST https://openrouter.ai/api/v1/chat/completions`

## Request Format
```json
{
  "model": "string",
  "messages": [
    { "role": "user" | "assistant" | "system", "content": "string" }
  ],
  "temperature": number (optional)
}
```

## Relevant Headers
- `Authorization: Bearer <OPENROUTER_API_KEY>`
- `Content-Type: application/json`
- `HTTP-Referer`: Site URL for rankings
- `X-Title`: Site title for rankings

## Validation Script (Isolated)
The Critic MCP uses `axios` to perform these calls. The following simplified test script (executed as part of `npm run test`) verifies the ability to handle various JSON-RPC 2.0 and MCP spec scenarios including noise redirection.
