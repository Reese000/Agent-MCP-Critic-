# 🛡️ Security Model: Guards & Protection

**Critic** is designed for safe autonomous operations. It implements multiple layers of protection to prevent unauthorized access or destructive actions.

## 🔒 Multi-Layered Protection

### 1. Permission Guards (`src/FilesystemHandler.ts`)
The `isProtected` method enforces global path exclusion. Any tool attempting to read, write, or delete in protected zones will be blocked.
- **Protected Dirs**: `.git`, `.antigravity`, `node_modules`, `dist`, `build`.
- **Protected Files**: `src/index.ts` (Core server logic is immutable by agents).

### 2. Semantic Indexing Ceilings (`src/Indexer.ts`)
The `CodeIndexer` implements a **50KB memory ceiling** (`MAX_FILE_SIZE_BYTES`).
- **Logic**: Files larger than 50KB (like massive node.js dependencies or binary data) are identified by path but skipped for symbol extraction.
- **Benefit**: Prevents runaway regex processing and excessive memory/token consumption.

### 3. Rate-Limit Serialization (`src/Throttler.ts`)
The `Throttler` strictly serializes all API and I/O requests.
- **Interval**: Enforces a minimum time-gap (e.g., 200ms) between tasks.
- **Stability**: Prevents 429 Rate Limit responses and ensures agent swarms do not overwhelm external providers.

### 4. Protocol Filtering (`src/ProtocolFilter.ts`)
Implicitly hijacks `stdout` to ensure that only valid JSON-RPC payloads are sent to the host.
- **Noise Cleanup**: Blocks arbitrary `console.log` noise from polluting the communication channel.
- **Security**: Ensures that the host receives only structured, machine-verifiable data.
