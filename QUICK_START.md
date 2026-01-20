# Quick Start: Run Your First Benchmark

## 🎯 Goal
Run a successful benchmark with **0% error rate** and see **meaningful performance metrics** on the Results page.

## ✨ What's New
- ✅ **Fixed Model Identifier Issue**: Benchmarks now use correct model ID format
- ✅ **Test Endpoint**: Verify models work before running full benchmarks
- ✅ **Live Progress**: Real-time status updates during benchmark execution
- ✅ **Auto-refresh**: Results page updates automatically when benchmark completes

---

## ✅ Prerequisites Checklist

Before running a benchmark, verify:

- [ ] **Backend is running**: Check terminal shows `Server running on http://localhost:3001`
- [ ] **Frontend is running**: Check browser at `http://localhost:3000`
- [ ] **Model is loaded**: Go to Models page, see status = "running"
- [ ] **Test endpoint works**: Click "Test" button - should return a response
- [ ] **Browser is current**: Use latest Chrome, Edge, or Firefox

---

## 🚀 Step-by-Step Quick Test (2-3 minutes)

### Step 1: Test Your Model First

1. Go to **Models** page
2. Find your loaded model
3. Click **"Test"** button
4. Wait for response (~5-30 seconds)
5. Verify you see: `{"success": true, "response": "...", "latency": 890}`

**Important**: If test fails, benchmark will also fail. Fix model loading issues first.

### Step 2: Configure Benchmark Settings

Go to **Benchmarks** page and set:

```
Iterations: 1     (quick test)
Concurrency: 1
Timeout: 60000    (60 seconds)
Temperature: 0.7
Streaming: ✓ (checked)
```

### Step 3: Select Scenarios

For quick testing, select just **1 scenario**:

- ✓ Simple Q&A - Short
- ☐ (Uncheck the rest)

**Why?** Single scenario with 1 iteration completes in ~30-60 seconds.

### Step 4: Select Model

- ✓ Check your running model (e.g., qwen2.5-coder-0.5b)
- Must show status "running" with green indicator
- Ensure test endpoint passed (from Step 1)

### Step 5: Run Benchmark

1. Click **"Run Benchmark"** button
2. You'll see animated spinner and progress indicator
3. **Wait patiently**: 30-60 seconds for 1 scenario, 1 iteration
4. Status will change from "running" to "completed"
5. Results page automatically loads when complete

---

## 📊 Step 6: View Results

1. Results page should load automatically
2. Or manually go to **Results** tab
3. Select your benchmark run from dropdown (most recent at top)
4. View comprehensive metrics and charts

### ✅ What You Should See (Success)

**Performance Scores:**
- Score: 50-100 (out of 100, depending on hardware)
- Model name: Shows model alias (readable name, NOT "model_1768...")

**Key Metrics:**
- 🚀 **TPS (Tokens/Second)**: 10-50+ depending on hardware and model size
- ⚡ **Latency P50**: 500-5000ms (typical response time)
- ✅ **Error Rate**: **0%** (all iterations successful)
- ⏱️ **TTFT (Time to First Token)**: 200-2000ms

**Charts:**
- Bar charts showing TPS and latency values
- Performance comparison visualizations
- Model name displayed correctly throughout

---

## ❌ What Indicates Failure

If you see:
- **TPS = 0**: All iterations failed
- **Error Rate = 100%**: Model not responding or timeout too low
- **No data in charts**: Benchmark didn't complete or had errors

**Solutions:**
1. **Run model test first**: Click "Test" button in Models tab
2. **Check backend logs**: Look for error messages in terminal
3. **Verify model loaded**: Status should be "running" not "stopped"
4. **Increase timeout**: Set to 60000ms if seeing timeouts
5. **Restart backend**: Stop and restart `npm run server`

---

## 🎓 Understanding Your Results

### Typical Performance Ranges (varies by hardware and model)

| Metric | Good | Excellent | What It Means |
|--------|------|-----------|---------------|
| **TPS** | 10-30 | 30-100+ | Tokens generated per second |
| **TTFT** | 200-1000ms | < 200ms | Time until first token appears |
| **P50 Latency** | 500-2000ms | < 500ms | Typical response time (50th percentile) |
| **P95 Latency** | 1000-5000ms | < 1000ms | 95% of responses faster than this |
| **Error Rate** | 0-5% | 0% | Percentage of failed inferences |
| **Score** | 50-80/100 | 80-100/100 | Overall performance rating |

### Performance Score Breakdown (0-100 scale)

- **40 points**: Throughput (TPS) - higher is better
- **40 points**: Latency (P95) - lower is better  
- **20 points**: Reliability (error rate) - 0% errors = full points

**Example Calculation:**
- TPS=25: (25/100)*40 = 10 points
- P95=1500ms: 40-(1500/100) = 25 points
- Error=0%: 20-(0*10) = 20 points
- **Total: 55/100** (Good performance)

---

## 🔧 Common Issues & Quick Fixes

### Issue: All iterations fail (100% error rate)

**Symptoms:** Benchmark completes but shows 0% success

**Fix:**
1. **Test the model first**: Click "Test" button in Models tab
2. If test fails, model isn't responding correctly
3. Check model is actually loaded (status = "running")
4. Restart backend: Stop server and run `npm run server`
5. Try loading model again

### Issue: Timeout errors

**Symptoms:** Errors mention "timeout" or "aborted"

**Fix:**
1. Increase timeout to **60000ms** (60 seconds)
2. Reduce iterations to 1-2 for testing
3. Select only 1 scenario
4. First inference may take longer - subsequent ones faster

### Issue: Model shows "running" but test fails

**Symptoms:** Status is green but test returns error

**Fix:**
1. Model may not be fully loaded
2. Wait 30 seconds and try test again
3. Check backend logs for errors
4. Try unloading and reloading the model
5. Verify Foundry Local service is responding

### Issue: Results show model IDs instead of names

**Symptoms:** See "model_1768..." everywhere

**Fix:**
1. This is OLD behavior - has been fixed
2. Restart backend server
3. Hard refresh browser: `Ctrl+Shift+R`
4. Should now show model alias correctly

---

## 🎯 Full Benchmark (All 9 Scenarios)

Once your quick test succeeds, run the complete benchmark:

1. **Settings:**
   ```
   Timeout: 60000ms
   Iterations: 5
   Temperature: 0.7
   Streaming: ✓
   ```

2. **Scenarios:** Select all 9

3. **Expected time:** 15-25 minutes
   - 9 scenarios × 5 iterations = 45 runs
   - First run: ~60s, subsequent: ~15s avg
   - Total: ~15-20 minutes

4. **Expected results:**
   - Avg TPS: 15-25
   - Avg P95: 5000-15000ms
   - Error rate: 0%
   - Score: 60-85/100

---

## 📖 More Help

- **Troubleshooting guide:** [BENCHMARK_GUIDE.md](docs/BENCHMARK_GUIDE.md)
- **Validation testing:** [VALIDATION_STEPS.md](docs/VALIDATION_STEPS.md)
- **Test checklist:** [TESTING_CHECKLIST.md](docs/TESTING_CHECKLIST.md)

---

## 🎉 Success Criteria

Your benchmark is **successful** when:

✅ Error rate = 0%  
✅ TPS > 10 tokens/sec  
✅ Model alias displays (not internal ID)  
✅ All visualizations show meaningful data  
✅ Performance score > 50/100  
✅ Charts and tables populated correctly  

**Congratulations!** You now have a working benchmark system! 🚀

---

## 💡 Pro Tips

1. **Always warm up the NPU first:**
   - Run 1 quick benchmark with 1 scenario, 3 iterations
   - Subsequent benchmarks will be faster

2. **Use streaming = true:**
   - Measures Time To First Token (TTFT)
   - More accurate performance metrics

3. **Compare NPU vs CPU:**
   - Load two models with unique aliases:
     - phi-3.5-mini-npu (NPU device)
     - phi-3.5-mini-cpu (CPU device)
   - Run benchmark with both selected
   - Compare results to see NPU advantage!

4. **Export your results:**
   - Click "Export JSON" or "Export CSV"
   - Save for later comparison
   - Track performance over time

---

**Ready?** Go to the Benchmarks page and start testing! 🚀
