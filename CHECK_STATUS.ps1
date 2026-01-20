#!/usr/bin/env pwsh
# CHECK_STATUS.ps1 - Quick status check for FLPerformance

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "     FLPerformance Status Check" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$allGood = $true

# Check Backend (Port 3001)
Write-Host "`n🔍 Checking Backend Server (port 3001)..." -ForegroundColor Cyan
try {
    $backend = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✅ Backend is RUNNING" -ForegroundColor Green
    Write-Host "   📊 Status Code: $($backend.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Backend is NOT running!" -ForegroundColor Red
    Write-Host "   💡 Solution: Run .\START_APP.ps1 or manually start with 'node src/server/index.js'" -ForegroundColor Yellow
    $allGood = $false
}

# Check Frontend (Port 3000)
Write-Host "`n🔍 Checking Frontend Server (port 3000)..." -ForegroundColor Cyan
try {
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    Write-Host "   ✅ Frontend is RUNNING" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend is NOT running!" -ForegroundColor Red
    Write-Host "   💡 Solution: Run .\START_APP.ps1 or manually start with 'cd src/client; npm run dev'" -ForegroundColor Yellow
    $allGood = $false
}

# Check storage.json
Write-Host "`n🔍 Checking storage.json..." -ForegroundColor Cyan
if (Test-Path "results\storage.json") {
    $storage = Get-Content "results\storage.json" | ConvertFrom-Json
    Write-Host "   ✅ storage.json exists" -ForegroundColor Green
    Write-Host "   📦 Models: $($storage.models.PSObject.Properties.Count)" -ForegroundColor Gray
    Write-Host "   🏃 Benchmark Runs: $($storage.benchmark_runs.PSObject.Properties.Count)" -ForegroundColor Gray
    Write-Host "   📈 Benchmark Results: $($storage.benchmark_results.PSObject.Properties.Count)" -ForegroundColor Gray
    Write-Host "   📝 Logs: $($storage.logs.Count)" -ForegroundColor Gray
    
    if ($storage.benchmark_runs.PSObject.Properties.Count -eq 0) {
        Write-Host "   ℹ️  No benchmark runs stored yet" -ForegroundColor Cyan
    }
} else {
    Write-Host "   ⚠️  storage.json not found!" -ForegroundColor Yellow
    Write-Host "   💡 Will be created automatically on first model load" -ForegroundColor Gray
}

# Check Foundry Local
Write-Host "`n🔍 Checking Foundry Local..." -ForegroundColor Cyan
try {
    $foundryVersion = & foundry --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Foundry Local is installed" -ForegroundColor Green
        Write-Host "   📦 Version: $foundryVersion" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Foundry Local not found!" -ForegroundColor Red
        Write-Host "   💡 Install from: https://github.com/microsoft/foundry-local" -ForegroundColor Yellow
        $allGood = $false
    }
} catch {
    Write-Host "   ❌ Foundry Local not found!" -ForegroundColor Red
    Write-Host "   💡 Install from: https://github.com/microsoft/foundry-local" -ForegroundColor Yellow
    $allGood = $false
}

# Check Node.js
Write-Host "`n🔍 Checking Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version
    Write-Host "   ✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Node.js not found!" -ForegroundColor Red
    $allGood = $false
}

# Summary
Write-Host "`n===================================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "✅ ALL SYSTEMS GO!" -ForegroundColor Green
    Write-Host "`nYour app should be accessible at:" -ForegroundColor Cyan
    Write-Host "   🌐 http://localhost:3000" -ForegroundColor Blue
    Write-Host "`nIf Benchmarks page is blank:" -ForegroundColor Yellow
    Write-Host "   1. Hard refresh browser: Ctrl+Shift+R" -ForegroundColor Gray
    Write-Host "   2. Check browser console (F12) for errors" -ForegroundColor Gray
    Write-Host "   3. Wait a few seconds for data to load" -ForegroundColor Gray
} else {
    Write-Host "⚠️  ISSUES DETECTED - See above for solutions" -ForegroundColor Yellow
    Write-Host "`n🚀 Quick Fix: Run .\START_APP.ps1 to start everything" -ForegroundColor Cyan
}
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""
