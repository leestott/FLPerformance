# Testing Checklist - Foundry Local SDK Integration

This checklist helps verify the SDK integration is working correctly after migration.

## Prerequisites Check

- [ ] **Foundry Local Installed**
  ```bash
  foundry-local --version
  ```
  Expected: Version number (e.g., `1.0.0`)

- [ ] **Node.js Version**
  ```bash
  node --version
  ```
  Expected: `v18.0.0` or higher

- [ ] **NPM Version**
  ```bash
  npm --version
  ```
  Expected: `9.0.0` or higher

- [ ] **Foundry Local in PATH**
  ```bash
  where foundry-local   # Windows
  which foundry-local   # macOS/Linux
  ```
  Expected: Path to Foundry Local executable

## Installation Tests

### Automated Installation

- [ ] **Windows Installation Script**
  ```powershell
  cd FLPerformance
  .\scripts\install.ps1
  ```
  Expected: All checks pass, dependencies installed

- [ ] **macOS/Linux Installation Script**
  ```bash
  cd FLPerformance
  chmod +x scripts/install.sh
  ./scripts/install.sh
  ```
  Expected: All checks pass, dependencies installed

### Manual Installation

- [ ] **Install Backend Dependencies**
  ```bash
  npm install
  ```
  Expected: No errors, `foundry-local-sdk` appears in `node_modules/`

- [ ] **Install Frontend Dependencies**
  ```bash
  cd src/client
  npm install
  cd ../..
  ```
  Expected: No errors, client dependencies installed

- [ ] **Verify SDK Installation**
  ```bash
  npm list foundry-local-sdk
  ```
  Expected: Package version displayed

## Server Startup Tests

- [ ] **Start Development Server**
  ```bash
  npm run dev
  ```
  Expected output:
  ```
  [INFO] Server starting...
  [INFO] Foundry Local service initialized
  [INFO] Service endpoint: http://127.0.0.1:8080
  [INFO] Backend server listening on port 3001
  [INFO] Frontend dev server listening on port 3000
  ```

- [ ] **Verify API Server**
  ```bash
  curl http://localhost:3001/api/health
  ```
  Expected: `{"status":"ok"}`

- [ ] **Verify Frontend**
  - Open browser: http://localhost:3000
  - Expected: FLPerformance UI loads

## Service Initialization Tests

### Test 1: Initialize Foundry Local Service

- [ ] **API Test**
  ```bash
  curl -X POST http://localhost:3001/api/models/initialize/start
  ```
  Expected:
  ```json
  {
    "success": true,
    "endpoint": "http://127.0.0.1:8080",
    "status": "Service initialized"
  }
  ```

- [ ] **UI Test**
  - Navigate to Models tab
  - Click "Initialize Foundry Local"
  - Expected: Success message, service shows as "Running"

### Test 2: Verify Service Health

- [ ] **Check Service Status**
  ```bash
  curl http://localhost:3001/api/models/status
  ```
  Expected:
  ```json
  {
    "initialized": true,
    "endpoint": "http://127.0.0.1:8080",
    "loadedModels": []
  }
  ```

## Model Loading Tests

### Test 3: Load a Small Model

- [ ] **Load Phi-3 Mini (API)**
  ```bash
  curl -X POST http://localhost:3001/api/models/microsoft/phi-3-mini-4k-instruct/load
  ```
  Expected: Progress events followed by success

- [ ] **Load Phi-3 Mini (UI)**
  - Click "Add Model"
  - Select `microsoft/phi-3-mini-4k-instruct`
  - Click "Load Model"
  - Expected: Progress bar → "Loaded" status

### Test 4: List Loaded Models

- [ ] **API Test**
  ```bash
  curl http://localhost:3001/api/models/loaded
  ```
  Expected:
  ```json
  {
    "models": [
      {
        "id": "microsoft/phi-3-mini-4k-instruct",
        "name": "Phi-3 Mini 4K Instruct",
        "status": "loaded",
        ...
      }
    ]
  }
  ```

- [ ] **UI Test**
  - Models tab shows loaded model with "Loaded" status
  - Model details visible (name, size, capabilities)

### Test 5: Model Health Check

- [ ] **Check Model Health**
  ```bash
  curl http://localhost:3001/api/models/microsoft/phi-3-mini-4k-instruct/health
  ```
  Expected:
  ```json
  {
    "healthy": true,
    "modelId": "microsoft/phi-3-mini-4k-instruct",
    "status": "loaded"
  }
  ```

## Inference Tests

### Test 6: Single Inference Request

- [ ] **Direct OpenAI API Call**
  ```bash
  curl -X POST http://127.0.0.1:8080/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
      "model": "microsoft/phi-3-mini-4k-instruct",
      "messages": [{"role": "user", "content": "Hello!"}],
      "max_tokens": 50
    }'
  ```
  Expected: JSON response with `choices[0].message.content`

- [ ] **Via FLPerformance API**
  ```bash
  curl -X POST http://localhost:3001/api/inference/test \
    -H "Content-Type: application/json" \
    -d '{
      "modelId": "microsoft/phi-3-mini-4k-instruct",
      "prompt": "What is 2+2?",
      "maxTokens": 50
    }'
  ```
  Expected: Response with generated text

### Test 7: Multiple Models Simultaneously

- [ ] **Load Second Model**
  ```bash
  curl -X POST http://localhost:3001/api/models/microsoft/phi-3-small-8k-instruct/load
  ```
  Expected: Success

- [ ] **Inference on Both Models**
  - Request 1: Model = `microsoft/phi-3-mini-4k-instruct`
  - Request 2: Model = `microsoft/phi-3-small-8k-instruct`
  - Expected: Both return different responses from their respective models

## Benchmark Tests

### Test 8: Run Simple Benchmark

- [ ] **Select Default Suite**
  - Navigate to Benchmarks tab
  - Select "default" benchmark suite
  - Expected: Suite details displayed

- [ ] **Configure Benchmark**
  - Select loaded model (Phi-3 Mini)
  - Set iterations: 5
  - Set concurrency: 1
  - Expected: Configuration saved

- [ ] **Execute Benchmark**
  - Click "Run Benchmark"
  - Expected: Progress bar shows 0/5 → 5/5
  - Expected: No errors in console

- [ ] **View Results**
  - Navigate to Results tab
  - Expected: Benchmark results displayed
  - Expected: Metrics include TPS, TTFT, latency

### Test 9: Multi-Model Benchmark

- [ ] **Run Comparison**
  - Select both loaded models
  - Run default benchmark
  - Expected: Results for both models
  - Expected: Comparison table/chart shows differences

## Model Unloading Tests

### Test 10: Unload Model

- [ ] **Unload via API**
  ```bash
  curl -X POST http://localhost:3001/api/models/microsoft/phi-3-mini-4k-instruct/stop
  ```
  Expected:
  ```json
  {
    "success": true,
    "message": "Model unloaded successfully"
  }
  ```

- [ ] **Verify Model Removed**
  ```bash
  curl http://localhost:3001/api/models/loaded
  ```
  Expected: Model no longer in list

- [ ] **Unload via UI**
  - Click "Unload" next to loaded model
  - Expected: Model status changes to "Available"

## Service Cleanup Tests

### Test 11: Stop Service

- [ ] **Cleanup via API**
  ```bash
  curl -X POST http://localhost:3001/api/shutdown
  ```
  Expected: Service stops gracefully

- [ ] **Verify Cleanup**
  - All models unloaded
  - Foundry Local service stopped
  - Server exits cleanly

## Error Handling Tests

### Test 12: Invalid Model ID

- [ ] **Load Non-Existent Model**
  ```bash
  curl -X POST http://localhost:3001/api/models/invalid-model-id/load
  ```
  Expected: Error response with message

### Test 13: Service Not Initialized

- [ ] **Load Model Before Init**
  - Restart server
  - Try to load model without initializing
  - Expected: Error "Service not initialized"

### Test 14: Inference on Unloaded Model

- [ ] **Request to Unloaded Model**
  ```bash
  curl -X POST http://127.0.0.1:8080/v1/chat/completions \
    -H "Content-Type: application/json" \
    -d '{
      "model": "unloaded-model-id",
      "messages": [{"role": "user", "content": "Test"}]
    }'
  ```
  Expected: Error response

## Performance Tests

### Test 15: Load Time

- [ ] **Measure Model Load Time**
  - Load Phi-3 Mini
  - Record time from request to completion
  - Expected: < 2 minutes (depending on download)

### Test 16: Throughput

- [ ] **High Concurrency Benchmark**
  - Set concurrency: 10
  - Set iterations: 50
  - Run benchmark
  - Expected: Completes without errors
  - Expected: TPS reported in results

### Test 17: Memory Usage

- [ ] **Monitor RAM**
  - Load multiple models
  - Check system RAM usage
  - Expected: Within system limits
  - Expected: No memory leaks during long runs

## Integration Tests

### Test 18: Full Workflow

- [ ] **End-to-End Test**
  1. Start server
  2. Initialize service
  3. Load 2 models
  4. Run benchmark on both
  5. View and export results
  6. Unload models
  7. Stop service
  - Expected: All steps complete successfully

### Test 19: Results Persistence

- [ ] **Export Results**
  - Run benchmark
  - Export as JSON
  - Expected: File saved in `results/` directory

- [ ] **Reload Results**
  - Restart server
  - Navigate to Results tab
  - Expected: Previous results still visible

## Validation Tests

### Test 20: URL Validation

- [ ] **Run URL Validator**
  ```bash
  node scripts/validate-urls.js
  ```
  Expected: All URLs valid (except npm package URLs with 403)

### Test 21: Installation Script Validation

- [ ] **Test Installation Scripts**
  - Run install.ps1 or install.sh
  - Verify all checks pass
  - Expected: SDK integration test succeeds

## Regression Tests

### Test 22: Verify Breaking Changes

- [ ] **Port Allocation**
  - Confirm single service on one port (8080)
  - No multiple ports allocated

- [ ] **Model IDs**
  - Verify full model IDs used in API calls
  - No short aliases in OpenAI requests

- [ ] **Endpoint Structure**
  - Confirm single endpoint for all models
  - No per-model endpoints

## Documentation Tests

### Test 23: Documentation Accuracy

- [ ] **Quick Start Guide**
  - Follow docs/quickstart.md
  - Expected: All steps work as documented

- [ ] **Migration Guide**
  - Review MIGRATION.md
  - Expected: All changes documented

- [ ] **Architecture Docs**
  - Review docs/architecture.md
  - Expected: Matches actual implementation

## Sign-Off

### Completed By

- **Name**: ___________________________
- **Date**: ___________________________
- **Environment**:
  - OS: ___________________________
  - Node.js: ___________________________
  - Foundry Local: ___________________________

### Test Summary

- Total Tests: 23
- Passed: _____
- Failed: _____
- Skipped: _____

### Issues Found

| Test # | Description | Severity | Status |
|--------|-------------|----------|--------|
| | | | |
| | | | |

### Approval

- [ ] All critical tests passed
- [ ] Known issues documented
- [ ] Ready for production use

**Signature**: ___________________________ **Date**: ___________
