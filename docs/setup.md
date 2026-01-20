# Installation & Setup Guide

This guide walks you through installing and setting up FLPerformance from scratch.

## Prerequisites

Before you begin, ensure you have:

### 1. System Requirements

**Minimum:**
- **OS:** Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)
- **RAM:** 16 GB (32 GB+ recommended for larger models)
- **Disk:** 50 GB free space (models can be large)
- **Network:** Internet connection for first-time model downloads

**Recommended:**
- **GPU:** NVIDIA GPU with CUDA support for faster inference
- **CPU:** Modern multi-core processor (Intel i7/i9, AMD Ryzen 7/9)
- **RAM:** 32 GB or more

**ARM64 Windows Compatibility (January 2026):**
- **Frontend Features**: ✅ All visualizations and UI components work perfectly
- **Backend Integration**: ✅ APIs, data processing, and storage functional
- **Model Inference**: ⚠️ Foundry Local compatibility issues on Snapdragon systems
- **Recommendation**: Use x64 Windows/Linux systems for full functionality

### 2. Software Prerequisites

#### Node.js and NPM
- **Version:** Node.js 18 or higher
- **Check:** Run `node --version` and `npm --version`
- **Install:** Download from [nodejs.org](https://nodejs.org/)

#### Microsoft Foundry Local
- **Required:** Foundry Local CLI must be installed and in your PATH
- **Check:** Run `foundry --version`
- **Install:** Follow Microsoft Foundry Local installation instructions
- **Documentation:** Visit https://aka.ms/foundry-local

**ARM64 Windows Note:** Foundry Local v0.8.117 has known compatibility issues on ARM64 Windows systems. While installation succeeds, the service may not properly accept connections.

#### Git (optional, for cloning)
- **Check:** Run `git --version`
- **Install:** Download from [git-scm.com](https://git-scm.com/)

## Installation Steps

### Step 1: Get the Code

If you have the project folder:
```bash
cd FLPerformance
```

If cloning from a repository:
```bash
git clone <repository-url>
cd FLPerformance
```

### Step 2: Verify Prerequisites

Run the Foundry Local diagnostic:
```bash
npm run check-foundry
```

This will verify:
- Foundry Local CLI is accessible
- Can list available models
- Service status is reachable

If this fails, install/configure Foundry Local before proceeding.

### Step 3: Install Dependencies

Run the setup script:
```bash
npm run setup
```

This installs:
- Backend (server) dependencies
- Frontend (client) dependencies

The process may take several minutes on first run.

### Step 4: (Optional) Create Environment File

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` if you need custom configuration:
- `PORT` - API server port (default: 3001)
- `LOG_LEVEL` - Logging verbosity (info, debug, error)

### Step 5: Start the Application

For development with hot-reload:
```bash
npm run dev
```

For production mode:
```bash
npm start
```

### Step 6: Access the Application

Open your browser:
- **Frontend:** http://localhost:3000
- **API:** http://localhost:3001/api

You should see the FLPerformance dashboard.

## Verifying Installation

### 1. Check System Health

In the UI:
1. Navigate to Dashboard
2. Check for any error messages
3. Verify "System Health" shows as healthy

### 2. Add a Test Model

1. Go to **Models** tab
2. Click **Add Model**
3. Select a small model like `phi-3-mini-4k-instruct`
4. Click **Add Model**

### 3. Start and Load Model

1. Click **Start** next to your model
2. Wait for status to change to "running"
3. Click **Load** to trigger model download (first time will be slow)
4. Check logs if any errors occur

### 4. Run a Test Benchmark

1. Go to **Benchmarks** tab
2. Select your model
3. Choose "default" suite
4. Set iterations to 2 (for quick test)
5. Click **Run Benchmark**
6. Check **Results** tab after a few minutes

## Troubleshooting

### Foundry Local Not Found

**Problem:** `foundry: command not found`

**Solutions:**
1. Verify Foundry Local is installed
2. Add Foundry Local to your PATH:
   - Windows: Add installation directory to System PATH
   - macOS/Linux: Add to `.bashrc` or `.zshrc`
3. Restart terminal/command prompt after PATH changes
4. Verify with: `foundry --help`

### ARM64 Windows Compatibility Issues

**Problem:** Models load but benchmarks fail with connection errors

**Diagnosis:**
```powershell
foundry --version  # Should show v0.8.117+
Test-NetConnection -ComputerName "127.0.0.1" -Port 58123  # May fail
```

**Solutions:**
1. **Explore Frontend**: All visualizations work perfectly regardless of backend
2. **Alternative Testing**: Use x64 Windows/Linux systems for full functionality
3. **Mock Data**: Modify storage.json to test with sample benchmark results
4. **Alternative Backends**: Consider Ollama, ONNX Runtime, or Hugging Face Transformers

### Port Already in Use

**Problem:** `Error: listen EADDRINUSE: address already in use :::3001`

**Solutions:**
1. Stop any other application using port 3001 or 3000
2. Change the port in `.env` file:
   ```
   PORT=3002
   ```
3. Restart the application

### Model Download Fails

**Problem:** Model fails to load with download error

**Solutions:**
1. Check internet connection
2. Verify sufficient disk space
3. Try running the model (downloads automatically):
   ```bash
   foundry model run phi-3-mini-4k-instruct
   ```
4. Check Foundry Local logs for details

### Service Won't Start

**Problem:** Service status shows "error" after clicking Start

**Solutions:**
1. Check the service logs in the UI (click "Logs" button)
2. Verify Foundry Local is running: `foundry service status`
3. Try restarting Foundry Local management service:
   ```bash
   foundry service restart
   ```
4. Check for port conflicts
5. Review system resources (RAM, disk space)

### GPU Not Detected

**Problem:** GPU metrics show as `null` or unavailable

**Solutions:**
1. Verify GPU drivers are installed
2. Check CUDA installation (NVIDIA GPUs)
3. Run `nvidia-smi` to verify GPU is accessible (NVIDIA)
4. Note: macOS has limited GPU metric support
5. CPU and RAM metrics will still be available

### Frontend Won't Load

**Problem:** Browser shows "Cannot connect" at localhost:3000

**Solutions:**
1. Check that `npm run dev` is running
2. Wait a few seconds for Vite dev server to start
3. Check console output for errors
4. Try refreshing the page
5. Clear browser cache
6. Try a different browser

### Database Errors

**Problem:** SQLite database errors in logs

**Solutions:**
1. Check disk space
2. Ensure `/results` directory is writable
3. Delete `/results/benchmarks.db` to reset (will lose data)
4. Check file permissions

### Benchmark Stuck/Not Progressing

**Problem:** Benchmark run never completes

**Solutions:**
1. Check if model service is still running
2. Increase timeout in benchmark settings
3. Check backend logs for errors:
   ```bash
   # In a separate terminal
   cd FLPerformance
   npm run server
   # Watch for error messages
   ```
4. Stop and restart services
5. Try with fewer iterations or simpler scenarios

## Advanced Configuration

### Custom Benchmark Suites

Create a new suite:
1. Copy `/benchmarks/suites/default.json`
2. Rename and modify scenarios
3. Place in `/benchmarks/suites/` directory
4. Restart application
5. New suite will appear in Benchmarks tab

### Adjusting Resource Limits

Foundry Local resource usage is controlled by Foundry Local configuration, not FLPerformance. Consult Foundry Local documentation for:
- Memory limits
- GPU allocation
- Thread/CPU limits

### Running on a Different Machine

To access FLPerformance from another machine on your network:

1. Update `vite.config.js`:
   ```js
   server: {
     host: '0.0.0.0',  // Listen on all interfaces
     port: 3000
   }
   ```

2. Update backend to listen on all interfaces (in `src/server/index.js` if needed)

3. Access via `http://<machine-ip>:3000`

⚠️ **Warning:** Only do this on trusted networks. No authentication is implemented.

## Updating

To update FLPerformance:

1. Backup your results:
   ```bash
   cp -r results results-backup
   ```

2. Pull new code (if from repository):
   ```bash
   git pull
   ```

3. Reinstall dependencies:
   ```bash
   npm run setup
   ```

4. Restart application

## Uninstalling

To remove FLPerformance:

1. Stop the application (Ctrl+C)
2. Remove the FLPerformance directory
3. Optionally remove Foundry Local (if no longer needed)

Note: Models cached by Foundry Local are not removed automatically. Use Foundry Local CLI to manage model cache.

## Getting Help

If you encounter issues not covered here:

1. Check `/docs/BENCHMARK_GUIDE.md` for known issues and troubleshooting
2. Review logs in the UI
3. Check backend console output
4. Review Foundry Local documentation
5. Ensure all prerequisites are met

## Next Steps

Once installation is complete:

1. Read the main README.md
2. Review `/docs/ARCHITECTURE.md` to understand the system
3. Add your models
4. Run your first benchmark
5. Explore results and export data

Happy benchmarking! 🚀
