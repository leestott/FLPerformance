#!/usr/bin/env pwsh
# START_APP.ps1 - FLPerformance Application Startup Script
# Starts both backend and frontend servers in separate terminal windows

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "     FLPerformance Application Startup" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

# Change to project directory
$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

Write-Host "`n📂 Project Directory: $ProjectDir" -ForegroundColor Gray

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "`n⚠️  Dependencies not installed!" -ForegroundColor Yellow
    Write-Host "Run .\scripts\install.ps1 first" -ForegroundColor Yellow
    pause
    exit 1
}

# Check if Foundry Local is installed
Write-Host "`n🔍 Checking Foundry Local installation..." -ForegroundColor Cyan
$foundryCheck = node scripts/check-foundry.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  Foundry Local is not installed!" -ForegroundColor Yellow
    Write-Host "Please install Foundry Local from:" -ForegroundColor Yellow
    Write-Host "https://github.com/microsoft/foundry-local" -ForegroundColor Blue
    pause
    exit 1
}

Write-Host "✅ Foundry Local installed" -ForegroundColor Green

# Start Backend Server in new terminal
Write-Host "`n🚀 Starting Backend Server (port 3001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Set-Location '$ProjectDir'
    Write-Host '==============================================' -ForegroundColor Green
    Write-Host '  BACKEND SERVER (Port 3001)' -ForegroundColor Green
    Write-Host '==============================================' -ForegroundColor Green
    Write-Host ''
    npm run server
"@

Start-Sleep -Seconds 2

# Start Frontend Server in new terminal
Write-Host "🚀 Starting Frontend Server (port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
    Set-Location '$ProjectDir/src/client'
    Write-Host '==============================================' -ForegroundColor Blue
    Write-Host '  FRONTEND SERVER (Port 3000)' -ForegroundColor Blue
    Write-Host '==============================================' -ForegroundColor Blue
    Write-Host ''
    npm run dev
"@

Write-Host "`n✅ Starting servers..." -ForegroundColor Green
Write-Host "`n📝 Two terminal windows should open:" -ForegroundColor Cyan
Write-Host "   • Backend Server (green header) - Port 3001" -ForegroundColor Gray
Write-Host "   • Frontend Server (blue header) - Port 3000" -ForegroundColor Gray

Write-Host "`n🌐 Opening application in browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
Start-Process "http://localhost:3000"

Write-Host "`n✅ FLPerformance is starting!" -ForegroundColor Green
Write-Host "`nℹ️  To stop the servers:" -ForegroundColor Yellow
Write-Host "   • Press Ctrl+C in each terminal window" -ForegroundColor Gray
Write-Host "   • Or close the terminal windows" -ForegroundColor Gray
Write-Host "`n===================================================" -ForegroundColor Cyan

pause
