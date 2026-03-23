$ErrorActionPreference = "Stop"

Write-Host "--- Critic-MCP Health-Check & Configuration Guide ---" -ForegroundColor Cyan

# 1. Environment Check
Write-Host "[1/4] Checking Node.js Environment..." -ForegroundColor Yellow
try {
    $nodeVersion = node -v
    Write-Host "  Node version: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed or not in PATH."
    exit 1
}

# 2. Dependency & Build Check
Write-Host "[2/4] Verifying Build Artifacts..." -ForegroundColor Yellow
if (Test-Path "dist/index.js") {
    Write-Host "  Found dist/index.js"
} else {
    Write-Warning "  Build artifact dist/index.js not found. Attempting rebuild..."
    npm run build
}

# 3. Environment Variables Check
Write-Host "[3/4] Verifying .env Configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env"
    if ($envContent -match "YOUR_OPENROUTER_API_KEY_HERE") {
        Write-Warning "  OPENROUTER_API_KEY is still using the placeholder value."
    } else {
        Write-Host "  OPENROUTER_API_KEY appears to be configured."
    }
} else {
    Write-Error "  .env file missing!"
    exit 1
}

# 4. Generate MCP Config Block
Write-Host "[4/4] Generating MCP Config Block..." -ForegroundColor Yellow
$absPath = (Get-Item "dist/index.js").FullName.Replace("\", "/")
$configBlock = @"
{
  "mcpServers": {
    "critic": {
      "command": "node",
      "args": ["$absPath"],
      "env": {}
    }
  }
}
"@

Write-Host "`nAdd the following to your Antigravity mcp_config.json:" -ForegroundColor Green
Write-Host "--------------------------------------------------------"
Write-Host $configBlock
Write-Host "--------------------------------------------------------"

Write-Host "`nHealthcheck Complete." -ForegroundColor Cyan
