# Benchmark Fix Guide 

## 🚀 How to Use 

### Step 1: Restart the Backend Server

**Important:** The backend must be restarted to load the fixed code.

```powershell
# If backend is running, press Ctrl+C to stop it
# Then restart:
npm run server
```

Or use the easy startup script:

```powershell
.\START_APP.ps1
```

### Step 2: Load Models

1. Open http://localhost:3000/#/models
2. Click **"Add Model"** if you haven't added models yet
3. Select a model (e.g., `qwen2.5-coder-0.5b-instruct-generic-cpu:4`)
4. Click **"Load Model"** button
5. Wait for status to change to **"running"** (green badge)

### Step 3: Test Model Inference ⚡ NEW!

1. Once model status shows **"running"**
2. Click the **"Test"** button next to the model
3. You should see a success message like:
   ```
   ✅ Test successful! Response: "Hello, I am working!" (1234ms)
   ```

**If the test fails:**
- Check that Foundry Local service is running: `foundry service status`
- Verify the model is loaded: Check Models page for "running" status
- Review logs by clicking the "Logs" button
- Try unloading and reloading the model

### Step 4: Run Benchmark

1. Go to http://localhost:3000/#/benchmarks
2. Select your **running model(s)** (checkboxes)
3. Choose benchmark suite (default is fine)
4. Configure settings:
   - **Iterations:** Start with 1 for testing (default: 5)
   - **Concurrency:** Keep at 1
   - **Timeout:** 60000ms (60 seconds)
   - **Streaming:** true (recommended)
5. Click **"Run Benchmark"**
6. Wait 1-2 minutes (longer for more iterations/scenarios)

### Step 5: View Results

1. Go to http://localhost:3000/#/results
2. Select your benchmark run from dropdown
3. You should now see:
   - ✅ Performance Score cards
   - ✅ "Best Model For..." cards
   - ✅ Comparison charts (TPS, Latency, Radar)
   - ✅ Detailed results table

## 🔍 Troubleshooting

### Models Won't Load

**Symptom:** Status stuck on "stopped" or "error"

**Solutions:**
1. Check Foundry Local is installed: `foundry --version`
2. Verify service is running: `foundry service status`
3. Try manually: `foundry model run <model-name>`
4. Check available disk space (models can be large)
5. Review logs in Models page → Logs button

### Test Button Shows Error

**Symptom:** "Test failed: 400 status code" or similar

**Solutions:**
1. Verify model status is "running" (not just loaded)
2. Wait 5-10 seconds after loading before testing
3. Check Foundry Local endpoint: http://127.0.0.1:<port>/v1/models
4. Review backend logs in terminal
5. Try unloading and reloading the model

### Benchmark Shows 100% Error

**Symptom:** Results page shows red "100%" error rates

**Solutions:**
1. **First: Restart backend server** (most common fix)
2. Run "Test" on each model before benchmarking
3. Reduce iterations to 1 for testing
4. Increase timeout to 120000ms (2 minutes)
5. Check that models are "running" not just "loaded"
6. Try one model at a time first

### Results Page Empty

**Symptom:** "No results available" after benchmark completes

**Solutions:**
1. Check benchmark didn't fail all tests
2. Look at Models page → ensure status is "running"
3. Test each model individually first
4. Review benchmark logs: Results page → view failed run → export JSON
5. Try a smaller benchmark suite with fewer scenarios

## 🧪 Testing Checklist

Before reporting issues, verify:

- [ ] Backend restarted after applying fixes
- [ ] Foundry Local is installed and in PATH
- [ ] Models show status: "running" (green)
- [ ] "Test" button works for all models
- [ ] Test shows actual response text and latency
- [ ] Benchmark runs with iterations=1 first
- [ ] Results page shows charts and tables

## 📊 Understanding Results

### Performance Scores
- **80-100:** Excellent performance
- **60-79:** Good performance
- **40-59:** Moderate performance
- **0-39:** Poor performance (consider different model/config)

### Key Metrics
- **TPS (Tokens/Second):** Higher is better (throughput)
- **P50 Latency:** Median response time (lower is better)
- **P95 Latency:** 95th percentile response time (lower is better)
- **Error Rate:** Percentage of failed requests (lower is better)

### Chart Types
1. **Performance Score Cards:** Overall ranking (0-100)
2. **Best Model For...:** Top performer by category
3. **TPS Bar Chart:** Throughput comparison
4. **Latency Bar Chart:** Response time comparison (P50, P95, P99)
5. **Radar Chart:** Multi-dimensional performance view

## 🔧 Technical Details

### Model Identifier Flow

```
1. User adds model → stores as: { alias, model_id }
2. Model loads → SDK returns: { id, alias, deviceType, etc. }
3. Benchmark uses: modelInfo.alias (from SDK)
4. OpenAI API accepts: alias (e.g., "qwen2.5-coder-0.5b")
```

### Foundry Local Architecture

```
Single Service Instance (foundry-local)
  ↓
Multiple Loaded Models (differentiated by alias)
  ↓
OpenAI-compatible API (http://localhost:port/v1)
  ↓
Chat Completions Endpoint (/v1/chat/completions)
```

### Streaming vs Non-Streaming

- **Streaming (recommended):** Enables TTFT measurement, better UX
- **Non-streaming:** Faster for batch processing, no TTFT metric

## 📚 Additional Resources

- [Foundry Local Documentation](https://aka.ms/foundry-local-docs)
- [Foundry Local SDK (npm)](https://www.npmjs.com/package/foundry-local-sdk)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Project README](../README.md)
- [Quick Reference](QUICK_REFERENCE.md)

## 🆘 Still Having Issues?

1. **Check backend logs:** Look at the terminal running `npm run server`
2. **Check frontend logs:** Open browser DevTools → Console tab
3. **Export results:** Even failed runs can be exported as JSON
4. **Review storage.json:** Located in `results/storage.json`
5. **Test manually:** Use `curl` or Postman to test endpoints directly

### Manual API Test

```bash
# Test model health
curl http://localhost:3001/api/models/<model-id>/health

# Test inference
curl -X POST http://localhost:3001/api/models/<model-id>/test \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Say hello"}'
```

## ✨ Success Indicators

You'll know everything is working when:

1. ✅ Models load and show "running" status
2. ✅ "Test" button returns actual responses
3. ✅ Benchmarks complete without 100% errors
4. ✅ Results page shows colorful charts and metrics
5. ✅ Performance scores display (0-100 range)
6. ✅ "Best Model For..." cards show model names

Happy benchmarking! 🚀
