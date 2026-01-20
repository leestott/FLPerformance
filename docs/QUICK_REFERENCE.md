# Quick Reference - Foundry Local SDK Integration

## Installation

### Automated (Recommended)
```powershell
# Windows (from project root)
.\scripts\install.ps1

# macOS/Linux (from project root)
chmod +x scripts/install.sh
./scripts/install.sh
```

### Manual
```bash
npm install
cd src/client && npm install
```

---

## Starting the Application

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm start
```

**URLs**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Foundry Local: http://127.0.0.1:8080

---

## Architecture at a Glance

```
Single FoundryLocalManager Instance
    ↓
Single Service (Port 8080)
    ↓
Multiple Models Loaded Simultaneously
    ↓
Differentiated by Model ID in API Calls
```

**Key Point**: One service, multiple models, differentiated by ID

---

## Model Management Workflow

### 1. Initialize Service (Once)
```bash
POST /api/models/initialize/start
```
**UI**: Models Tab → "Initialize Foundry Local"

### 2. Load Model
```bash
POST /api/models/microsoft/phi-3-mini-4k-instruct/load
```
**UI**: Models Tab → "Add Model" → Select → "Load Model"

### 3. List Loaded Models
```bash
GET /api/models/loaded
```
**UI**: Models Tab shows all loaded models

### 4. Unload Model
```bash
POST /api/models/microsoft/phi-3-mini-4k-instruct/stop
```
**UI**: Models Tab → "Unload" button

### 5. Cleanup (Shutdown)
```bash
POST /api/shutdown
```
**UI**: Stop server (Ctrl+C)

---

## Inference API

### Direct OpenAI API Call
```bash
curl -X POST http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "microsoft/phi-3-mini-4k-instruct",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 50
  }'
```

### Via FLPerformance API
```bash
curl -X POST http://localhost:3001/api/inference/test \
  -H "Content-Type: application/json" \
  -d '{
    "modelId": "microsoft/phi-3-mini-4k-instruct",
    "prompt": "What is 2+2?",
    "maxTokens": 50
  }'
```

---

## Critical Code Patterns

### ✅ CORRECT: Use Full Model ID
```javascript
const response = await openai.chat.completions.create({
  model: 'microsoft/phi-3-mini-4k-instruct',
  messages: [...]
});
```

### ❌ WRONG: Short Alias Won't Work
```javascript
const response = await openai.chat.completions.create({
  model: 'phi-3-mini',  // ❌ Will fail
  messages: [...]
});
```

### ✅ CORRECT: Single OpenAI Client
```javascript
const openai = new OpenAI({
  baseURL: 'http://127.0.0.1:8080',
  apiKey: 'not-needed'
});

// Use same client for all models, differentiate by model ID
const response1 = await openai.chat.completions.create({
  model: 'microsoft/phi-3-mini-4k-instruct',
  messages: [...]
});

const response2 = await openai.chat.completions.create({
  model: 'meta/llama-3-8b-instruct',
  messages: [...]
});
```

### ❌ WRONG: Multiple Clients Per Model
```javascript
const client1 = new OpenAI({ baseURL: 'http://localhost:8080' });
const client2 = new OpenAI({ baseURL: 'http://localhost:8081' });
// ❌ No multiple endpoints
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Server health check |
| `/api/models/initialize/start` | POST | Initialize Foundry Local service |
| `/api/models/status` | GET | Service initialization status |
| `/api/models/loaded` | GET | List all loaded models |
| `/api/models/:id/load` | POST | Load specific model |
| `/api/models/:id/stop` | POST | Unload specific model |
| `/api/models/:id/health` | GET | Model health check |
| `/api/inference/test` | POST | Test inference request |
| `/api/shutdown` | POST | Graceful shutdown |

---

## Common Issues & Solutions

### Service Fails to Start
```bash
# Check Foundry Local installation
foundry --version

# Verify CLI in PATH
where foundry   # Windows
which foundry   # macOS/Linux

# Try manual start
foundry service start
```

### Model Load Fails
```bash
# Check disk space
df -h  # Linux/macOS
Get-PSDrive  # Windows

# Try manual load
foundry model run phi-3-mini-4k-instruct

# Check logs
# See server console output
```

### Port Conflicts
```bash
# Check what's using port 8080
netstat -ano | findstr :8080  # Windows
lsof -i :8080                 # macOS/Linux

# Stop conflicting service
```

### SDK Not Found
```bash
# Install SDK
npm install foundry-local-sdk

# Verify installation
npm list foundry-local-sdk
```

---

## Testing Commands

### Quick Validation
```bash
# Run URL validator
node scripts/validate-urls.js

# Check service health
curl http://localhost:3001/api/health

# Check Foundry Local
foundry --version
```

### Full Test Suite
See [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for 23 comprehensive tests

---

## Key Files

### Core Implementation
- `src/server/orchestrator.js` - FoundryLocalManager wrapper
- `src/server/benchmark.js` - Benchmark engine
- `src/server/index.js` - Express API server
- `package.json` - Dependencies (includes foundry-local-sdk)

### Documentation
- `README.md` - Main documentation
- `../QUICK_START.md` - Getting started guide
- `MIGRATION.md` - Migration from old implementation
- `TESTING_CHECKLIST.md` - Testing procedures
- `IMPLEMENTATION_SUMMARY.md` - Complete implementation details

### Scripts
- `scripts/install.ps1` - Windows installation
- `scripts/install.sh` - macOS/Linux installation
- `scripts/validate-urls.js` - URL validation

---

## Important Concepts

### 1. Single Service Architecture
- **One** FoundryLocalManager instance
- **One** service endpoint (http://127.0.0.1:8080)
- **Multiple** models loaded simultaneously
- Models differentiated by **model ID**

### 2. Model IDs vs Aliases
- **Always use full model ID**: `microsoft/phi-3-mini-4k-instruct`
- **Never use short alias**: `phi-3-mini` (won't work)
- Model ID is required in OpenAI API calls

### 3. Service Lifecycle
1. Initialize service (once)
2. Load models (as needed)
3. Run inference (multiple times)
4. Unload models (optional)
5. Cleanup on shutdown

---

## Cheat Sheet

### Prerequisites Check
```bash
node --version    # Need v18+
npm --version     # Need v9+
foundry --version  # Must be installed
```

### Installation
```bash
# From project root directory:
npm install
cd src/client && npm install && cd ../..
```

### Start Server
```bash
npm run dev
```

### Initialize Service
```bash
curl -X POST http://localhost:3001/api/models/initialize/start
```

### Load Model
```bash
curl -X POST http://localhost:3001/api/models/microsoft/phi-3-mini-4k-instruct/load
```

### Test Inference
```bash
curl -X POST http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"microsoft/phi-3-mini-4k-instruct","messages":[{"role":"user","content":"Hello"}]}'
```

### Stop Everything
- Press `Ctrl+C` in server terminal
- Or: `curl -X POST http://localhost:3001/api/shutdown`

---

## Resources

- **Quick Start**: [QUICK_START.md](../QUICK_START.md)
- **Testing**: [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md)
- **Foundry Local Docs**: https://aka.ms/foundry-local-docs
- **GitHub**: https://github.com/microsoft/foundry-local
- **SDK (npm)**: https://www.npmjs.com/package/foundry-local-sdk

---

## Getting Help

1. Check [QUICK_START.md](../QUICK_START.md)
2. Review [BENCHMARK_GUIDE.md](BENCHMARK_GUIDE.md) for troubleshooting
3. Check server console logs
4. Verify Foundry Local CLI works: `foundry --version`
5. Run validation: `node scripts/validate-urls.js`

---

**Quick Reference Version**: 1.0  
**For**: FLPerformance with Foundry Local SDK Integration
