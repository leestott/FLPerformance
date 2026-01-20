# Troubleshooting Guide

## Issue: Model IDs showing instead of model aliases (e.g., "model_1768864521547_bzemvknnr")

### Symptoms
- Results page shows internal model IDs instead of readable aliases like "phi-3.5-mini"
- Data visualizations don't display properly
- Model names appear as cryptic IDs in charts and tables

### Root Cause
The backend server has code to enrich results with `model_alias`, but it requires a restart to take effect.

### Solution
**Restart the backend server:**

1. Find the terminal running the backend (look for `node src/server/index.js`)
2. Press `Ctrl+C` to stop it
3. Restart it: `node src/server/index.js`
4. The frontend will automatically detect and display model aliases

---

## Issue: Benchmarks timing out (30+ seconds)

### Symptoms
- All benchmark iterations fail with "Request was aborted" errors
- Error rate: 100%
- Timeout rate: 80-100%
- Benchmarks stuck in "running" status

### Root Cause
- Default timeout of 30 seconds is insufficient for ARM/NPU hardware
- First inference on Phi-3.5-mini NPU can take 40-60+ seconds
- Subsequent inferences are faster (5-15 seconds)

### Solution
**Increase the timeout to 60 seconds:**

1. Open the Benchmarks page in the UI
2. Change timeout from `30000` to `60000` (60 seconds)
3. **For quick testing**: Use 2-3 iterations instead of 5
4. **For quick testing**: Select only 1-2 scenarios instead of all 9

**Note**: The default timeout has been updated to 60000ms in the code. If you still see 30000ms, do a hard refresh (Ctrl+Shift+R) of your browser.

---

## Issue: Duplicate model aliases

### Symptoms
- Multiple models showing the same alias name
- Can't differentiate between NPU and CPU versions
- Confusion when viewing results

### Root Cause
Multiple models added with the same alias (e.g., both named "phi-3.5-mini")

### Solution
**Use unique aliases when loading models:**

```bash
# NPU version
foundry model run phi-3.5-mini-instruct-qnn-npu:1 --alias phi-3.5-mini-npu

# CPU version  
foundry model run phi-3.5-mini-instruct-generic-cpu:1 --alias phi-3.5-mini-cpu
```

Or in the UI, set unique aliases like:
- `phi-3.5-mini-npu` for NPU device
- `phi-3.5-mini-cpu` for CPU device

---

## Issue: Benchmark stuck in "running" status

### Symptoms
- Benchmark shows status "running" but never completes
- All iterations have failed but benchmark doesn't finish
- Can't run new benchmarks

### Root Cause
Previous benchmark encountered fatal errors but didn't properly clean up state

### Solution
**Restart the backend server:**

1. Stop backend: `Ctrl+C` in the backend terminal
2. Restart: `node src/server/index.js`
3. The stuck benchmark will be cleared

---

## Issue: Data visualizations look incorrect

### Symptoms
- Charts showing weird data or empty
- Performance scores showing as 0 or NaN
- "Best Model" cards not appearing

### Root Cause
1. Backend not restarted (model_alias not populated)
2. No successful benchmark iterations (all timeouts/errors)
3. Browser cache showing old version

### Solution
1. **Restart backend** to enable model_alias enrichment
2. **Increase timeout** to 60 seconds to prevent timeouts
3. **Run a successful benchmark** with proper configuration:
   - Timeout: 60000ms (60 seconds)
   - Iterations: 3 (for quick testing)
   - Scenarios: Select 1-2 scenarios first
   - Models: Use models with unique aliases
4. **Hard refresh browser**: `Ctrl+Shift+R` or `Ctrl+F5`

---

## Issue: "Model not loaded" errors in logs

### Symptoms
- Logs show: "Model model_XXX not loaded. Please load the model first."
- Benchmarks fail immediately
- Models show as "running" but benchmarks can't use them

### Root Cause
Models need time to initialize after loading. The health check may be using the wrong endpoint.

### Solution
1. Wait 10-15 seconds after loading a model before running benchmarks
2. Verify model status in Models page shows "running" with a valid endpoint
3. Restart backend if models are loaded but not detected

---

## Best Practices for Snapdragon X Elite ARM64 with NPU

Based on your hardware (Snapdragon X Elite, QNN NPU, 32GB RAM):

### Recommended Benchmark Configuration
```
Timeout: 60000ms (60 seconds)
Iterations: 3-5
Concurrency: 1 (NPU doesn't benefit from concurrency)
Temperature: 0.7
Streaming: true (to measure TTFT)
```

### Expected Performance (Phi-3.5-mini on NPU)
- **First Token Time (TTFT)**: 8-12 seconds (first run), 3-8 seconds (subsequent)
- **Throughput**: 15-25 tokens/second
- **Total Latency**: 5-15 seconds for 100-token responses
- **Error Rate**: Should be 0% with 60s timeout

### Quick Validation Test (5-10 minutes)
1. Load one model with a clear alias: `phi-3.5-mini-npu`
2. Set timeout to 60000ms
3. Select 2 scenarios: "Simple Q&A - Short" and "Summarization - Short Text"
4. Set iterations to 3
5. Run benchmark
6. Verify: 0% error rate, TPS > 10, latency < 15s

### Full Benchmark Test (15-25 minutes)
1. Load two models: `phi-3.5-mini-npu` and `phi-3.5-mini-cpu`
2. Set timeout to 60000ms
3. Select all 9 scenarios
4. Set iterations to 5
5. Run benchmark
6. Compare NPU vs CPU performance in visualizations

---

## Foundry Local Configuration

### Check Foundry Local Status
```bash
# List all models
foundry model ls

# Check running models
foundry model ps

# View logs
foundry --logs
```

### Common Foundry Local Issues

**Issue**: Model download fails
- **Solution**: Check internet connection, try again, or manually download

**Issue**: Model won't start
- **Solution**: Restart Foundry Local service, check available RAM/disk space

**Issue**: NPU not detected
- **Solution**: Update Qualcomm drivers, restart Foundry Local

### Useful Foundry Local Commands
```bash
# Stop all models
foundry model stop --all

# Remove cached model
foundry model rm <model-name>

# Get model info
foundry model info <model-name>
```

---

## Still Having Issues?

1. **Check console logs**: Open browser DevTools (F12) → Console tab
2. **Check backend logs**: Look at terminal running `node src/server/index.js`
3. **Check Foundry logs**: Run `foundry --logs`
4. **Clear everything and start fresh**:
   ```bash
   # Stop backend (Ctrl+C)
   # Stop all models
   foundry model stop --all
   
   # Clear storage
   # (Backup first if needed)
   rm results/storage.json
   echo '{"models":{},"benchmark_runs":{},"benchmark_results":{},"logs":[]}' > results/storage.json
   
   # Restart backend
   node src/server/index.js
   
   # Load models with unique aliases
   foundry model run phi-3.5-mini-instruct-qnn-npu:1 --alias phi-3.5-mini-npu
   ```

5. **Review validation documents**:
   - `VALIDATION_TEST.md` - Test plan overview
   - `VALIDATION_STEPS.md` - Step-by-step guide with detailed instructions

---

## Quick Checklist Before Running Benchmarks

- [ ] Backend server is running (`node src/server/index.js`)
- [ ] Frontend is running (`npm run dev` in src/client)
- [ ] At least one model shows status "running" in Models page
- [ ] Each model has a **unique** alias
- [ ] Timeout set to **60000ms** (60 seconds)
- [ ] Selected 1-2 scenarios for quick test (not all 9)
- [ ] Iterations set to 3-5 (not 10+)
- [ ] Browser cache cleared (Ctrl+Shift+R)

---

## Summary of Fixes Applied

✅ **Results page**: Enhanced with comprehensive visualizations (score cards, charts, radar)  
✅ **Model alias display**: Backend enriches results with `model_alias` (requires restart)  
✅ **Timeout increased**: Default changed from 30000ms to 60000ms  
✅ **Scenario selection**: All 9 scenarios visible with individual checkboxes  
✅ **Backend filtering**: Accepts `selectedScenarios` array to run subset of scenarios  
✅ **Health checks**: Fixed to use model alias instead of Foundry ID  
✅ **API calls**: Fixed to use model alias for OpenAI compatibility  

**Next**: Restart backend, increase timeout to 60s, run validation test with unique aliases!
