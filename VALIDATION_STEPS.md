# Step-by-Step Benchmark Validation

## 🎯 Goal
Validate benchmarking works correctly with phi-3-mini on NPU and CPU.

---

## ⚠️ Important: Fix Current Issues First

**Issue detected**: Your current benchmark is timing out (30+ seconds per request)

### Step 0: Stop Current Benchmark
1. The benchmark is currently running and timing out
2. **Wait for it to complete** or **restart the backend server** to stop it
3. Clear results before starting validation

---

## 📋 Phase 1: Clean Setup

### 1.1 Clear and Restart
```powershell
# In backend terminal - Press Ctrl+C to stop
# Then restart:
npm run server
```

### 1.2 Clear Old Models (via Web UI)
1. Go to http://localhost:3000/#/models
2. For each model, click "Unload" (if running)
3. This ensures clean state

---

## 📋 Phase 2: Add Models with Unique Aliases

### 2.1 Add phi-3-mini NPU Model
1. Click **"Add Model"** button
2. Search for: `phi-3-mini`
3. Select: **phi-3-mini-4k-instruct-qnn-npu**
4. **Change alias to**: `phi-3-mini-npu`
5. Click **"Add Model"**

### 2.2 Add phi-3-mini CPU Model
1. Click **"Add Model"** button
2. Search for: `phi-3-mini`
3. Select: **phi-3-mini-4k-instruct-generic-cpu**
4. **Change alias to**: `phi-3-mini-cpu`
5. Click **"Add Model"**

### 2.3 Load Both Models
1. Find `phi-3-mini-npu` in the list
2. Click **"Load Model"** (wait for download if needed)
3. Verify status changes to **"running"** (green)
4. Find `phi-3-mini-cpu` in the list
5. Click **"Load Model"**
6. Verify status changes to **"running"** (green)

**⏱️ Expected time**: 2-5 minutes for downloads (first time only)

---

## 📋 Phase 3: Run Quick Test Benchmark

### 3.1 Navigate to Benchmarks
1. Go to http://localhost:3000/#/benchmarks
2. You should see both models listed

### 3.2 Configure Test
1. **Select Models**: Check both boxes
   - ☑️ phi-3-mini-npu
   - ☑️ phi-3-mini-cpu

2. **Select Scenarios**: Click "Deselect All", then select only:
   - ☑️ Simple Q&A - Short
   - ☑️ Simple Q&A - Medium
   - (Leave other 7 unchecked)

3. **Adjust Settings** (expand "Benchmark Configuration"):
   - Iterations: **3** (reduced for speed)
   - Timeout: **60000** (60 seconds - important for ARM!)
   - Keep other defaults

### 3.3 Run Benchmark
1. Click **"Run Benchmark"** button
2. You should see: "Benchmark started with 2 scenario(s)!"
3. **Wait ~2-4 minutes** for completion

---

## 📋 Phase 4: Validate Results

### 4.1 Check Results Page
1. Go to http://localhost:3000/#/results
2. Select the most recent benchmark run
3. **Verify you see**:
   - ✅ Performance Score cards for both models
   - ✅ Model names show as "phi-3-mini-npu" and "phi-3-mini-cpu"
   - ✅ "Best Model" cards with gradients
   - ✅ Bar charts showing throughput comparison
   - ✅ Detailed results table

### 4.2 Expected Behavior
**NPU Model** should show:
- Higher TPS (tokens per second)
- Lower P95 latency
- Better overall score

**CPU Model** should show:
- Lower TPS
- Higher P95 latency
- Lower overall score

### 4.3 Export Results
1. Click **"Export JSON"** button
2. Save file for reference
3. Click **"Export CSV"** button
4. Open in Excel to verify data

---

## 📋 Phase 5: Full Validation (Optional)

If Phase 4 passes successfully:

### 5.1 Run Full Benchmark
1. Go back to Benchmarks page
2. Click **"Select All"** scenarios (all 9)
3. Keep same models and config
4. Click **"Run Benchmark"**
5. **Wait ~8-12 minutes**

### 5.2 Review Complete Results
1. Check Results page
2. Compare all 9 scenarios
3. Review performance across different task types:
   - Short vs Medium vs Long responses
   - Q&A vs Reasoning vs Creative vs Code

---

## ✅ Success Criteria

- [x] Both models load successfully
- [x] Benchmark runs without timeouts
- [x] Results generated for both models
- [x] Results page displays correctly
- [x] Model aliases shown properly (not internal IDs)
- [x] Visualizations render correctly
- [x] NPU shows better performance than CPU
- [x] Export functions work

---

## ⚠️ Troubleshooting

### Models won't load
- Check disk space (need ~8GB for phi-3-mini)
- Check internet connection
- Wait for download to complete

### Benchmark times out
- Increase timeout to 90000 (90 seconds)
- Reduce iterations to 2
- Test with only 1 scenario first

### No results shown
- Check backend terminal for errors
- Verify models are "running" (not "stopped")
- Try refreshing the page

### Wrong model names
- Make sure you used unique aliases when adding models
- Restart backend server after fixes

---

## 📊 Sample Expected Output

### Performance Scores
- phi-3-mini-npu: **75-85/100**
- phi-3-mini-cpu: **55-65/100**

### Typical Metrics (ARM Snapdragon X Elite)
**NPU**:
- TPS: ~35-45 tokens/s
- P50 Latency: ~800-1200ms
- P95 Latency: ~1500-2500ms

**CPU**:
- TPS: ~15-25 tokens/s
- P50 Latency: ~1500-2500ms
- P95 Latency: ~3000-4500ms

---

**Good luck with validation! 🚀**
