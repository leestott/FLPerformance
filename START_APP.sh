#!/bin/bash
# START_APP.sh - FLPerformance Application Startup Script
# Starts both backend and frontend servers

echo ""
echo "==================================================="
echo "     FLPerformance Application Startup"
echo "==================================================="
echo ""

# Change to project directory
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)

echo "📂 Project Directory: $PROJECT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo ""
    echo "⚠️  Dependencies not installed!"
    echo "Run ./scripts/install.sh first"
    exit 1
fi

# Check if Foundry Local is installed
echo ""
echo "🔍 Checking Foundry Local installation..."
node scripts/check-foundry.js
if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Foundry Local is not installed!"
    echo "Please install Foundry Local from:"
    echo "https://github.com/microsoft/foundry-local"
    exit 1
fi

echo "✅ Foundry Local installed"

# Start servers using concurrently
echo ""
echo "🚀 Starting both servers..."
echo ""
npm run dev
