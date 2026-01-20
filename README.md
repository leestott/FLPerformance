# FLPerformance - Foundry Local LLM Benchmark Tool

A local application with UI for benchmarking multiple Large Language Models (LLMs) running via **Microsoft Foundry Local**.

## ✨ New: Easy Startup Script

**Windows users**: Just run `.\START_APP.ps1` to start everything! Opens 2 terminals + browser automatically. 🚀

## 🎉 Latest Updates (January 2026)

### ✅ Successfully Implemented Features
- **Enhanced Results Visualizations**: Comprehensive charts, performance cards, and radar graphs
- **Benchmark History**: Recent runs table with real-time statistics
- **Critical Bug Fixes**: Fixed model loading from alias to model_id lookup
- **Frontend/Backend Integration**: Full API connectivity and data flow
- **ARM64 Hardware Detection**: Proper Snapdragon X Elite recognition

### ⚠️ Known Compatibility Issue
- **Foundry Local ARM64**: Service initialization issues on Windows ARM64 systems
- **Workaround**: Consider using smaller models (qwen2.5-0.5b) or alternative model serving
- **Status**: Under investigation - visualizations and benchmark system are ready

## Overview

FLPerformance enables you to:
- Manage Foundry Local service using the official JavaScript SDK
- Load and benchmark multiple models simultaneously
- Run standardized benchmark tests across models
- Display clear performance statistics with tables and charts
- Export results for analysis

## Quick Start

### Before You Begin

**Required: Install Microsoft Foundry Local first**
```powershell
# Windows
winget install Microsoft.FoundryLocal

# macOS
brew install foundry-local

# Or download from: https://aka.ms/foundry-local-installer
```

Verify installation:
```bash
foundry-local --version
```

### Installation (3 Steps)

**Step 1: Navigate to project directory**
```powershell
cd C:\Users\YourUsername\path\to\FLPerformance
```

**Step 2: Run installation script**
```powershell
# Windows
.\scripts\install.ps1

# macOS/Linux
chmod +x scripts/install.sh && ./scripts/install.sh
```

**Note**: Installation uses `--no-optional` flag to skip SQLite database (requires build tools).  
Results are saved as JSON files instead. This works perfectly for all features!

**ARM64 Windows Note**: If you're on ARM64 Windows (Snapdragon X Elite), the visualizations and benchmark system work perfectly, but you may need to use alternative models or check Foundry Local ARM64 compatibility.

**Step 3: Start the application**
```powershell
# Easy Mode - Opens 2 terminals + browser automatically (Windows)
.\START_APP.ps1

# Manual Mode - Starts both servers
npm run dev
```

### Access the Application

Once the server starts, open your browser:

**🌐 http://localhost:3000**

You'll see:
- **Models** tab - Add and load AI models
- **Benchmarks** tab - Run performance tests
- **Results** tab - View comparison charts

### First Time Setup (In the UI)

1. Click **Models** → **Initialize Foundry Local** (one-time setup)
2. Click **Add Model** → Select `phi-3-mini-4k-instruct`
3. Click **Load Model** (downloads ~2GB, takes 2-5 minutes)
4. Go to **Benchmarks** → Select your model → **Run Benchmark**
5. View results in **Results** tab

---

### Alternative: Manual Installation

### Required Software

1. **Microsoft Foundry Local**
   - Download from: https://aka.ms/foundry-local-installer
   - Verify installation: `foundry-local --version`
   - **Note**: Foundry Local CLI must be in your PATH

2. **Node.js & NPM**
   - Node.js v18 or higher
   - NPM v9 or higher
   - Download from: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

3. **System Requirements**
   - Windows 10/11, macOS, or Linux
   - Minimum 16GB RAM (32GB+ recommended for multiple models)
   - GPU with CUDA support (optional but recommended)
   - Adequate disk space for model storage (varies by model, typically 5-50GB per model)

### Alternative: Manual Installation

If the automated script doesn't work:

### 1. Install Dependencies

```bash (skip optional SQLite)
npm install --no-optional

# Install frontend dependencies
cd src/client
npm install
cd ../..

# Create results directory
mkdir results
```

**Want SQLite database support?** Install Visual Studio Build Tools first:
```powershell
# Windows only - needed for better-sqlite3
winget install Microsoft.VisualStudio.2022.BuildTools --silent --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools"

# Then install with optional dependencies
npm install

# Create results directory
mkdir results
```

### 2. Start the Application

```bash
# Development mode (with hot reload)
```bash
npm run dev
```

**Access the application at: http://localhost:3000**

The application will be available at:
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:3001

---

## Prerequisites (For Reference)

1. Open the UI at http://localhost:3000
2. Navigate to the **Models** tab
3. Click **"Initialize Foundry Local"** to start the service
4. Click **"Add Model"**
5. Select a model from the available Foundry Local catalog (e.g., `phi-3-mini-4k-instruct`)
6. Click **"Load Model"** to download (if needed) and load the model into memory

**Note**: Foundry Local uses a single service instance that can load multiple models simultaneously. Models are differentiated by their model ID when making inference requests.

### 4. Run Your First Benchmark

1. Navigate to the **Benchmarks** tab
2. Select the **"default"** benchmark suite
3. Choose one or more models to benchmark
4. Configure settings (iterations, concurrency, etc.)
5. Click **"Run Benchmark"**
6. Watch live progress as tests execute

### Viewing Results

1. Navigate to the **Results** tab
2. View comparison tables and charts
3. Filter by run, model, or benchmark type
4. Export results as JSON or CSV

---

## Project Structure

```
FLPerformance/
├── src/
│   ├── server/              # Backend API
│   │   ├── index.js         # Express server entry point
│   │   ├── orchestrator.js  # Foundry Local service orchestration
│   │   ├── benchmark.js     # Benchmark engine
│   │   ├── storage.js       # Results storage (JSON + SQLite)
│   │   └── logger.js        # Structured logging
│   └── client/              # Frontend UI (React/Vue)
│       ├── public/
│       └── src/
│           ├── components/  # UI components
│           ├── pages/       # Page views
│           └── utils/       # Client utilities
├── benchmarks/
│   └── suites/
│       └── default.json     # Default benchmark suite definition
├── docs/
│   ├── architecture.md      # System architecture
│   ├── limitations.md       # Known limitations
│   └── api.md              # API documentation
├── scripts/
│   └── helpers/            # Utility scripts
├── results/
│   └── example/            # Example benchmark results
├── package.json
└── README.md
```

## Key Features

### Model & Service Management
- Unified service management using foundry-local-sdk
- Add/remove models from Foundry Local catalog
- Load multiple models simultaneously in a single service
- Monitor model health and status in real-time
- Automatic model download and caching

### Benchmark Suite
- **Throughput (TPS)**: Tokens generated per second
- **Latency**: Time to first token (TTFT) and end-to-end completion time
- **Stability**: Error rate and timeout tracking
- **Resource Usage**: CPU, RAM, and GPU utilization (platform-dependent)

### Results & Comparison
- Side-by-side model comparison tables
- Interactive charts for TPS, latency distributions (p50/p95/p99), error rates
- "Best model for..." recommendations based on metrics
- Export results as JSON or CSV

## Configuration

Default settings can be modified in the **Settings** tab:
- Default iterations per benchmark
- Concurrency level
- Request timeout values
- Results storage path
- Streaming mode (if supported)

## Architecture

FLPerformance uses the official **foundry-local-sdk** JavaScript package to manage the Foundry Local service:

- **Single Service Instance**: One Foundry Local service handles all models
- **Multiple Loaded Models**: Models are loaded on-demand and run simultaneously
- **OpenAI-Compatible API**: Standard OpenAI client for inference requests
- **Model Differentiation**: Models are identified by their model ID in API calls

See [Architecture Documentation](docs/architecture.md) for details.

## Troubleshooting

### Service fails to start
- Ensure Foundry Local is installed: `foundry-local --version`
- Verify Foundry Local CLI is in your PATH
- Check that port 8080 is available (default Foundry Local port)
- View logs in the **Models** tab for specific error messages

### Model fails to load
- Verify sufficient disk space for model download
- Check network connectivity for first-time downloads
- Ensure adequate RAM for model size
- Try manually loading with Foundry Local CLI: `foundry-local model load <model-id>`

### Benchmark timeouts
- Increase timeout values in Settings
- Reduce concurrency level
- Check system resource availability (RAM, GPU memory)

### ARM64 Windows Compatibility (Snapdragon X Elite)
- **Symptom**: Models load successfully but benchmarks fail with 500 errors
- **Cause**: Foundry Local service doesn't properly start on some ARM64 systems
- **Verification**: Check if `foundry serve` keeps the service running
- **Alternatives**: Try smaller models like `qwen2.5-0.5b-instruct-generic-cpu:4`
- **Status**: Frontend visualizations and backend work perfectly - issue is Foundry Local ARM64 compatibility

### Installation Issues
- Run the appropriate installation script (install.ps1 or install.sh) for detailed diagnostics
- Check [Quick Start Guide](docs/quickstart.md) for common installation issues
- Verify Node.js version: `node --version` (must be v18+)

## Documentation

For more detailed information, see:
- [Quick Start Guide](docs/quickstart.md) - Comprehensive getting started guide
- [Quick Reference](QUICK_REFERENCE.md) - Commands and code patterns cheat sheet
- [Architecture Documentation](docs/architecture.md) - System design and SDK integration
- [Known Limitations](docs/limitations.md) - Current constraints and workarounds
- [API Reference](docs/api.md) - REST API endpoint documentation
- [Migration Guide](MIGRATION.md) - Migrating from previous implementation
- [Testing Checklist](TESTING_CHECKLIST.md) - 23 comprehensive test cases
- [Implementation Summary](IMPLEMENTATION_SUMMARY.md) - Complete implementation details

## Resources

- [Microsoft Foundry Local](https://aka.ms/foundry-local-docs)
- [Foundry Local GitHub](https://github.com/microsoft/foundry-local)
- [Foundry Local SDK (npm)](https://www.npmjs.com/package/foundry-local-sdk)

## Support

For issues or questions:
1. Check the documentation in `/docs`
2. Review logs in the UI under each service
3. Examine results in `/results` directory

## License

MIT License
