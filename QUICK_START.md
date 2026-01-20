# Quick Start: Run Your First Successful Benchmark

## 🎯 Goal
Run a successful benchmark with **0% error rate** and see **meaningful visualizations** on the Results page.

---

## ✅ Prerequisites Checklist

Before running a benchmark, verify:

- [ ] **Backend is running**: Check terminal shows `Server running on http://localhost:3001`
- [ ] **Frontend is running**: Check browser at `http://localhost:3000`
- [ ] **Model is loaded**: Go to Models page, see status = "running"
- [ ] **Model has unique alias**: e.g., "phi-3.5-mini-npu" (not internal ID)
- [ ] **Browser cache cleared**: Press `Ctrl+Shift+R` to hard refresh

---

## 🚀 Step-by-Step Quick Test (5 minutes)

### Step 1: Configure Benchmark Settings

Go to **Benchmarks** page and set:

```
Timeout: 60000  (60 seconds - CRITICAL for ARM/NPU!)
Iterations: 3
Concurrency: 1
Temperature: 0.7
Streaming: ✓ (checked)
```

### Step 2: Select Scenarios

Instead of all 9 scenarios, select just **1-2 for quick testing**:

- ✓ Simple Q&A - Short
- ✓ Summarization - Short Text
- ☐ (Uncheck the rest)

**Why?** First inference on NPU takes 40-60 seconds. Fewer scenarios = faster results.

### Step 3: Select Model

- ✓ Check your running model (e.g., phi-3.5-mini)
- Must show status "running" with green indicator

### Step 4: Run Benchmark

1. Click **"Run Benchmark"** button
2. You'll see progress indicator
3. **Wait patiently**: 3-5 minutes
   - First iteration: ~60 seconds (NPU initialization)
   - Subsequent iterations: ~15-30 seconds each
4. Status will change from "running" to "completed"

---

## 📊 Step 5: View Results

1. Go to **Results** page
2. Select your benchmark run from dropdown (most recent at top)
3. Click **"Load Results"**

### ✅ What You Should See (Success)

**Performance Scores:**
- Score: 60-90 (out of 100)
- Model name: "phi-3.5-mini" (readable alias, NOT "model_1768864...")

**Best Model Cards:**
- 🚀 Highest Throughput: **15-25 TPS**
- ⚡ Lowest Latency: **5000-15000 ms** (5-15 seconds)
- ✅ Most Reliable: **0% error**
- ⏱️ Fastest First Token: **3000-8000 ms** (3-8 seconds)

**Charts:**
- Bar charts showing TPS and latency values
- Radar chart comparing dimensions
- Model name = "phi-3.5-mini" everywhere

**Detailed Results Table:**
- Model column: "phi-3.5-mini"
- TPS: > 10 tokens/sec
- Error %: **0.0%** (green badge)

---

## ❌ What Indicates Failure

If you see:
- **TPS = 0**: All iterations failed or timed out
- **Error Rate = 100%**: Timeout too low or model crashed
- **Model ID showing**: "model_1768864..." means backend not restarted
- **Score = 0-40**: Data is bad, benchmark failed

**Solution:** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

---

## 🎓 Understanding Your Results

### Expected Performance (Snapdragon X Elite NPU)

| Metric | Expected Value | What It Means |
|--------|---------------|---------------|
| **TPS** | 15-25 tokens/sec | How fast model generates text |
| **TTFT** | 3-8 seconds | Time to first token (subsequent runs) |
| **TTFT (first)** | 40-60 seconds | First inference (NPU warmup) |
| **P50 Latency** | 5-10 seconds | Typical response time (100 tokens) |
| **P95 Latency** | 10-15 seconds | 95% of responses faster than this |
| **Error Rate** | 0% | All inferences succeeded |
| **Score** | 60-90/100 | Overall performance rating |

### Performance Score Breakdown (0-100 scale)

- **30 points**: Throughput (TPS)
  - 0 TPS = 0 points
  - 30 TPS = 30 points (max)
- **40 points**: Latency (P95)
  - 0 ms = 40 points (max)
  - 10000 ms = 0 points
- **30 points**: Reliability (error rate)
  - 0% error = 30 points (max)
  - 10% error = 0 points

**Example:** TPS=20, P95=8000ms, Error=0%
- TPS: (20/100)*30 = 6 points
- Latency: 40 - (8000/100) = -40 → 0 points
- Reliability: 30 - (0*10) = 30 points
- **Total: 36/100** (needs optimization!)

---

## 🔧 Common Issues & Quick Fixes

### Issue: Timeout errors (100% error rate)

**Symptoms:** All iterations fail with "Request was aborted"

**Fix:**
1. Set timeout to **60000ms** (not 30000ms)
2. Reduce iterations to 3
3. Select fewer scenarios (1-2)
4. Try again

### Issue: Model IDs showing instead of aliases

**Symptoms:** See "model_1768864..." everywhere

**Fix:**
1. Restart backend: Press `Ctrl+C` then `node src/server/index.js`
2. Hard refresh browser: `Ctrl+Shift+R`
3. Load results again

### Issue: Visualizations empty or showing zeros

**Symptoms:** All charts flat, TPS=0, latency=0

**Fix:** This is **OLD DATA** from failed benchmarks
1. Run a **NEW benchmark** with proper settings
2. Verify timeout = 60000ms
3. Wait for completion (3-5 minutes)
4. Select the NEW benchmark in Results dropdown

### Issue: First iteration takes forever (60+ seconds)

**This is NORMAL for NPU!**
- First inference: 40-60 seconds (NPU initialization)
- Subsequent inferences: 10-20 seconds
- This is why we increased timeout to 60 seconds

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

- **Detailed troubleshooting:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Validation testing:** [VALIDATION_STEPS.md](VALIDATION_STEPS.md)
- **Test plan:** [VALIDATION_TEST.md](VALIDATION_TEST.md)

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
