# FLPerformance Benchmark Validation Test

## Objective
Validate the benchmark system works correctly with phi-3-mini models on both NPU and CPU.

## Test Plan

### Phase 1: Model Setup
1. ✅ Clear existing storage (already done)
2. ⚠️ Stop current running models (timeout issues detected)
3. Add phi-3-mini models with unique aliases:
   - `phi-3-mini-npu` (NPU device)
   - `phi-3-mini-cpu` (CPU device)
4. Load both models and verify status = "running"

### Phase 2: Quick Benchmark Test
Run a minimal benchmark with:
- **Models**: Both phi-3-mini (NPU + CPU)
- **Scenarios**: 2 simple scenarios only
  - Simple Q&A - Short
  - Simple Q&A - Medium
- **Config**:
  - Iterations: 3 (reduced from 5)
  - Timeout: 60000 (increased to 60 seconds)
  - Streaming: true

### Phase 3: Validation Checks
1. ✅ Benchmark completes without timeouts
2. ✅ Results generated for both models
3. ✅ Results page displays properly with:
   - Model aliases (not internal IDs)
   - Performance scores
   - Comparison charts
4. ✅ Both NPU and CPU results are comparable

### Phase 4: Full Benchmark Test
If Phase 3 passes:
- Run full 9-scenario benchmark
- Compare NPU vs CPU performance
- Verify visualizations show correctly

## Current Issues Detected

### Issue 1: Timeout Errors (CRITICAL)
```
"error": "Request was aborted."
"timeout": true
```
**Cause**: Models taking >30 seconds to respond
**Fix**: Increase timeout to 60 seconds for ARM devices

### Issue 2: Duplicate Aliases
```
Both models have alias: "phi-3.5-mini"
```
**Cause**: Same alias used for both models
**Fix**: Use unique aliases (phi-3.5-mini-npu, phi-3.5-mini-cpu)

### Issue 3: Model Mismatch
**Requested**: phi-3-mini
**Current**: phi-3.5-mini
**Fix**: Add correct phi-3-mini models

## Expected Results

### NPU Performance (Qualcomm QNN)
- Lower latency (optimized for ARM NPU)
- Higher throughput
- Lower power consumption

### CPU Performance (Generic ARM)
- Higher latency
- Lower throughput
- Higher CPU utilization

## Validation Script

See `VALIDATION_STEPS.md` for step-by-step manual validation process.

## Automated Validation

Run validation with:
```powershell
.\scripts\validate-benchmark.ps1
```

(Script to be created if needed)

---

**Status**: ⚠️ Validation in progress
**Last Updated**: 2026-01-19
