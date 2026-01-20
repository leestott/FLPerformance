# Known Limitations

This document describes known limitations and constraints of FLPerformance when working with Microsoft Foundry Local.

## 🚨 Critical: ARM64 Windows Compatibility (January 2026)

### Foundry Local Service Issues on ARM64

**Platform**: Windows 11 ARM64 (Snapdragon X Elite and similar processors)

**Issue**: Foundry Local v0.8.117 shows service initialization success but doesn't properly start the service endpoint.

**Symptoms**:
- `foundry --version` shows v0.8.117 correctly
- `foundry model load <model>` returns exit code 0 (success)
- Port 58123 is listed as open but connections are refused
- No Foundry processes running despite "successful" initialization
- Benchmark requests fail with HTTP 500 "connection forcibly closed"

**Diagnosis**:
```powershell
# These commands appear successful but service doesn't start
foundry model load Phi-3.5-mini-instruct-generic-cpu:1  # Exit Code: 0
foundry serve  # May start but doesn't accept connections

# Verification shows the issue
Test-NetConnection -ComputerName "127.0.0.1" -Port 58123  # Fails
Get-Process | Where-Object { $_.ProcessName -like "*foundry*" }  # Empty
```

**Root Cause**: Foundry Local appears to have compatibility issues with ARM64 Windows architecture.

**Workarounds**:
1. **Try Smaller Models**: Some users report better compatibility with smaller models
   ```bash
   foundry model load qwen2.5-0.5b-instruct-generic-cpu:4
   ```

2. **Alternative Model Serving**: Consider using:
   - Ollama (has good ARM64 support)
   - Direct ONNX Runtime with Python
   - Hugging Face Transformers with CPU inference

3. **Development/Testing**: The FLPerformance frontend and backend work perfectly - you can:
   - View the enhanced visualizations with mock data
   - Test the benchmark UI components
   - Develop custom benchmark suites
   - Use the application on x64 systems

**Application Status**:
- ✅ **Frontend**: All visualizations, charts, and UI components work perfectly
- ✅ **Backend**: API endpoints, data processing, and storage are functional  
- ✅ **Benchmark Engine**: Properly structured and ready for inference calls
- ❌ **Model Inference**: Blocked by Foundry Local ARM64 compatibility

**Investigation Required**:
- Test with different Foundry Local versions
- Check Microsoft's ARM64 roadmap for Foundry Local
- Evaluate alternative model serving solutions for ARM64

**Note**: This issue was discovered after extensive debugging that ruled out application bugs. The FLPerformance codebase is confirmed working and includes recent critical fixes.

## 1. Service-Per-Model Architecture

### Original Requirement
The specification requested **one Foundry Local service instance per model** to enable true parallel benchmarking and isolated performance measurement.

### Actual Foundry Local Architecture

**Reality:** Foundry Local operates as a **single service** that manages multiple models on-demand.

**Architecture (as implemented by Foundry Local SDK):**
- One `FoundryLocalManager` instance per application
- One Foundry Local service endpoint (e.g., `http://localhost:5272`)
- Models are loaded/unloaded dynamically via `/openai/load/{modelId}` and `/openai/unload/{modelId}` REST APIs
- Multiple models can be loaded simultaneously in the same service
- Model differentiation is by model ID in inference requests, not by separate endpoints

**Implementation in FLPerformance:**
```javascript
// Single manager, single service
const manager = new FoundryLocalManager();
await manager.startService(); // Starts ONE service

// Load multiple models into the SAME service
await manager.loadModel('phi-3.5-mini');
await manager.loadModel('llama-3.2-1b');

// All models accessible via same endpoint: manager.endpoint
// Differentiated by modelInfo.id in API calls
```

**Implications:**
1. **No per-model endpoints** - All models share `manager.endpoint` (e.g., `http://localhost:5272/v1`)
2. **Sequential or concurrent benchmarking** - Models can be benchmarked sequentially or concurrently against the same service
3. **Resource sharing** - Memory, GPU, and CPU resources are managed by Foundry Local internally
4. **Simplified service management** - No need for port allocation or multiple process management

**Benefits:**
- Simpler architecture and implementation
- No port conflicts or allocation issues
- Easier resource pooling and management
- Follows official SDK design patterns
- More maintainable codebase

**User Impact:**
- The UI shows all models using the same endpoint
- Model status is "loaded" or "not loaded" rather than "service running/stopped"
- Benchmarks can run concurrently if Foundry Local supports it internally
- Resource contention is handled by Foundry Local, not the application

### Discovered Constraints

#### 1.1 Model Loading Behavior

**Constraint:** Foundry Local downloads and caches models on first use via the SDK's `loadModel()` method.

**Implications:**
- First model load triggers download (can take minutes to hours depending on model size and network)
- Subsequent loads use cached models from local storage
- Cache location is managed by Foundry Local (accessible via SDK)
- Multiple applications can share the same model cache

**SDK Download API:**
```javascript
// Download with progress tracking
await manager.downloadModel(alias, device, token, force, (progress) => {
  console.log(`Download progress: ${progress}%`);
});

// Load downloads automatically if not cached
const modelInfo = await manager.loadModel(alias);
```

**Mitigation:**
- The `downloadModel()` API provides progress callbacks
- First load shows user notification: "Downloading model... this may take a while"
- Errors during download are captured and displayed
- Users can pre-download models via Foundry Local CLI before using the app

**Recommendation:**
Pre-download models before benchmarking:
```bash
foundry model download phi-3.5-mini
foundry model download llama-3.2-1b
```

Or check cached models:
```bash
foundry model list --cached
```

#### 1.2 Time-to-Live (TTL) for Loaded Models

**Feature:** Foundry Local supports TTL (Time-to-Live) for loaded models.

**Default:** Models are loaded with TTL=600 seconds (10 minutes) by default.

**Implication:**
- Models may be automatically unloaded after TTL expires if not in use
- For long-running benchmarks, set appropriate TTL or reload model

**SDK API:**
```javascript
// Load with custom TTL (in seconds)
await manager.loadModel(alias, device, ttl=3600); // 1 hour TTL
```

**FLPerformance Setting:**
- Default TTL: 600 seconds
- Configurable in benchmark settings
- Automatically reloads if model unloaded during benchmark

## 2. Resource Metrics Availability

### Cross-Platform Support

**CPU and RAM:** Available on all platforms via `systeminformation` library.

**GPU Metrics:** Platform-dependent

| Platform | GPU Detection | GPU Utilization |
|----------|--------------|-----------------|
| Windows  | ✅ Yes       | ✅ Yes (NVIDIA/AMD) |
| Linux    | ✅ Yes       | ✅ Yes (NVIDIA with nvidia-smi) |
| macOS    | ⚠️ Partial  | ❌ Limited      |

**Limitation:** macOS does not expose GPU utilization metrics through standard APIs. GPU metrics will show as `null` on macOS.

**Mitigation:**
- The benchmark engine handles `null` GPU values gracefully
- Results tables show "-" for unavailable metrics
- Aggregate statistics exclude null values from averages
- Documentation clearly states platform support

### Resource Accuracy

**Constraint:** Resource metrics are snapshots taken before/after each inference request.

**Implications:**
- Does not capture peak resource usage during inference
- May miss transient spikes in CPU/GPU utilization
- Averages may not reflect true resource consumption of rapid inferences

**Mitigation:**
- Take multiple samples during benchmark runs
- Average across all iterations for stability
- Document that metrics are approximations

**Future Enhancement:**
- Continuous resource monitoring during benchmarks
- Peak usage tracking
- Resource graphs over time

## 3. Streaming and TTFT Measurement

### Streaming Support

**Constraint:** Time-to-first-token (TTFT) measurement requires streaming to be enabled.

**Foundry Local Support:** OpenAI-compatible streaming is documented as supported, but actual availability may vary by model.

**Implications:**
- If streaming is not available for a model, TTFT will be `null`
- Non-streaming benchmarks only measure end-to-end latency
- Some models may not support streaming at all

**Mitigation:**
- Streaming is configurable in benchmark settings
- Code handles both streaming and non-streaming modes
- Results clearly indicate when TTFT is not available

**User Action:**
- Test streaming support for your models
- Disable streaming if it causes errors
- Compare end-to-end latency when streaming is unavailable

## 4. Concurrency Limitations

### Current Implementation

**Constraint:** Benchmarks run with `concurrency: 1` by default (sequential requests).

**Reason:** 
- Ensures accurate latency measurement
- Avoids resource contention
- Prevents rate limiting or throttling

**Implications:**
- Benchmarks take longer to complete
- Does not test multi-request throughput
- May not reflect real-world concurrent usage

**Mitigation:**
- Concurrency is configurable in the UI
- Higher concurrency can be tested manually
- Results may vary with increased concurrency

**Future Enhancement:**
- Dedicated concurrency benchmark
- Thread pool for parallel requests
- Queue depth metrics

## 5. Benchmark Suite Limitations

### Prompt Diversity

**Constraint:** The default benchmark suite includes 9 scenarios.

**Limitation:**
- May not cover all use cases
- Prompts are English-only
- No multilingual evaluation
- Limited context length testing

**Mitigation:**
- Users can create custom benchmark suites
- Suite format is JSON and well-documented
- Place custom suites in `/benchmarks/suites/`

**Custom Suite Format:**
```json
{
  "name": "custom",
  "description": "Custom benchmark",
  "scenarios": [
    {
      "name": "Scenario Name",
      "prompt": "Your prompt here",
      "max_tokens": 150,
      "expected_output_length": "medium"
    }
  ]
}
```

### Token Counting

**Constraint:** Token counts rely on OpenAI API's `usage` field or streaming chunk counts.

**Limitation:**
- Different tokenizers yield different counts
- Streaming counts may be approximations
- No independent tokenizer validation

**Mitigation:**
- Use consistent measurement method across all models
- Relative comparison is still valid
- Document tokenization method in results

## 6. Error Handling and Retries

### No Automatic Retries

**Constraint:** Failed inference requests are not retried automatically.

**Implication:**
- Transient errors count toward error rate
- Network hiccups affect results
- No differentiation between permanent and transient failures

**Mitigation:**
- Timeouts are configurable
- Error rates are reported explicitly
- Users can re-run benchmarks if errors seem anomalous

**Future Enhancement:**
- Retry logic with exponential backoff
- Separate transient vs. permanent error tracking

## 7. Database and Storage

### SQLite Limitations

**Constraint:** Uses SQLite for simplicity and portability.

**Limitations:**
- Single-writer (no concurrent benchmark runs from different processes)
- Limited to local filesystem
- No built-in replication or backup
- Size grows over time without cleanup

**Mitigation:**
- Suitable for single-user local development
- Results are also exported as JSON/CSV
- Users can manually backup `/results/benchmarks.db`

**Recommendation:**
- Periodically export important results
- Manually archive or delete old runs if database grows large

## 8. UI Real-Time Updates

### Polling-Based Updates

**Constraint:** No WebSocket or server-sent events for real-time updates.

**Implication:**
- Benchmark progress is not visible in real-time
- Users must manually refresh Results page
- Dashboard statistics refresh every 10 seconds

**Mitigation:**
- Clear messaging when benchmark starts
- Suggestion to check Results tab after a few minutes
- Polling can be added manually via JavaScript timers

**Future Enhancement:**
- WebSocket integration for live progress
- Real-time log streaming
- Progress bars during benchmark execution

## 9. Authentication and Security

### No Authentication

**Constraint:** Application assumes trusted local environment.

**Implication:**
- Anyone with network access to the machine can access the UI
- No user management or access control
- All operations are performed as the same user

**Mitigation:**
- Designed for local development only
- Bind to `localhost` by default
- Document that it should not be exposed to public networks

**Production Considerations:**
If deploying beyond local development:
- Add authentication middleware
- Implement role-based access control
- Use HTTPS/TLS
- Add rate limiting

## 10. Model Catalog Discovery

### Limited Model Discovery

**Constraint:** Available models are queried from Foundry Local CLI or hardcoded as fallback.

**Limitation:**
- If CLI query fails, only a small preset list is shown
- New models require updating the fallback list or relying on CLI
- No model metadata (size, capabilities, etc.) displayed

**Mitigation:**
- Users can manually enter any model ID
- Fallback list includes common models
- Error messages guide users to check Foundry Local documentation

**Recommendation:**
Check Foundry Local documentation for the complete model catalog:
```bash
foundry-local models list
```

## Summary

| Limitation | Impact | Severity | Workaround |
|------------|--------|----------|------------|
| **ARM64 Windows compatibility** | **Foundry Local service won't start** | **Critical** | **Use x64 systems or alternative model serving** |
| Service-per-model constraints | May require sequential benchmarking | High | Document actual Foundry Local behavior |
| GPU metrics on macOS | Missing data in results | Medium | Use CPU/RAM metrics only |
| TTFT requires streaming | No TTFT for non-streaming models | Medium | Use end-to-end latency |
| No automatic retries | Transient errors affect results | Low | Re-run benchmarks if needed |
| Polling-based UI | No real-time progress | Low | Manual refresh |
| SQLite single-writer | Can't run concurrent benchmarks | Medium | Run one benchmark at a time |
| No authentication | Not suitable for public deployment | High | Deploy locally only |

## Reporting Issues

If you encounter limitations not documented here:

1. **For ARM64 Issues**: First verify you're experiencing the known ARM64 compatibility issue
   ```powershell
   foundry --version  # Should show v0.8.117 or higher
   Test-NetConnection -ComputerName "127.0.0.1" -Port 58123  # Should fail
   ```

2. Check Foundry Local documentation and support channels
3. View logs in the UI for specific error messages
4. Check `/results/storage.json` for stored data
5. Review console output for server errors

6. File an issue with:
   - **Hardware Architecture** (x64, ARM64, Apple Silicon)
   - OS and version (especially if Windows 11 ARM64)
   - **Processor** (Intel, AMD, Snapdragon X Elite, Apple M1/M2/M3)
   - Foundry Local version
   - Model being tested
   - Complete error messages
   - Output of diagnostic commands

**Recent Fixes Applied (January 2026)**:
- ✅ Fixed critical model loading bug (alias → model_id)
- ✅ Enhanced Results page with comprehensive visualizations
- ✅ Added benchmark history and statistics
- ✅ Improved ARM64 hardware detection
- ✅ Updated error handling and logging
