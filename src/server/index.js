import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import storage from './storage.js';
import orchestrator from './orchestrator.js';
import benchmark from './benchmark.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ============================================================================
// Models API
// ============================================================================

/**
 * GET /api/models/available
 * List available models from Foundry Local catalog
 */
app.get('/api/models/available', async (req, res) => {
  try {
    const models = await orchestrator.listAvailableModels();
    res.json({ models });
  } catch (error) {
    logger.error('Failed to list available models', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/models/loaded
 * List currently loaded models in Foundry Local service
 */
app.get('/api/models/loaded', async (req, res) => {
  try {
    const models = await orchestrator.listLoadedModels();
    res.json({ models });
  } catch (error) {
    logger.error('Failed to list loaded models', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/models
 * List all configured models
 */
app.get('/api/models', async (req, res) => {
  try {
    const models = storage.getAllModels();
    res.json({ models });
  } catch (error) {
    logger.error('Failed to get models', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/models
 * Add a new model
 */
app.post('/api/models', async (req, res) => {
  try {
    const { alias, model_id } = req.body;
    
    if (!alias || !model_id) {
      return res.status(400).json({ error: 'alias and model_id are required' });
    }

    const id = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const model = {
      id,
      alias,
      model_id,
      status: 'stopped'
    };

    storage.saveModel(model);
    logger.info('Model added', { id, alias, model_id });
    
    res.status(201).json({ model });
  } catch (error) {
    logger.error('Failed to add model', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/models/:id
 * Remove a model
 */
app.delete('/api/models/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Stop service if running
    const service = orchestrator.getService(id);
    if (service) {
      await orchestrator.stopService(id);
    }
    
    storage.deleteModel(id);
    logger.info('Model deleted', { id });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete model', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/models/:id/start
 * Load model into Foundry Local service (downloads and loads)
 */
app.post('/api/models/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const model = storage.getModel(id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    // Load model (will initialize service if needed)
    const modelInfo = await orchestrator.loadModel(id, model.alias || model.model_id);
    
    logger.info('Model loaded', { id, modelInfo });
    
    res.json({ 
      success: true,
      modelInfo: {
        id: modelInfo.id,
        alias: modelInfo.alias,
        deviceType: modelInfo.deviceType,
        executionProvider: modelInfo.executionProvider
      },
      endpoint: orchestrator.manager.endpoint
    });
  } catch (error) {
    logger.error('Failed to load model', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/models/:id/stop
 * Unload model from Foundry Local service
 */
app.post('/api/models/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const model = storage.getModel(id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    await orchestrator.unloadModel(id, model.alias || model.model_id);
    logger.info('Model unloaded', { id });
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to unload model', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/models/:id/load
 * Load model into Foundry Local service (download if needed) - same as /start
 */
app.post('/api/models/:id/load', async (req, res) => {
  try {
    const { id } = req.params;
    const model = storage.getModel(id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Load model using SDK (downloads if needed)
    const modelInfo = await orchestrator.loadModel(id, model.model_id || model.alias);
    
    logger.info('Model loaded', { id, modelInfo });
    
    res.json({ 
      success: true,
      modelInfo: {
        id: modelInfo.id,
        alias: modelInfo.alias,
        deviceType: modelInfo.deviceType,
        executionProvider: modelInfo.executionProvider
      },
      endpoint: orchestrator.manager.endpoint
    });
  } catch (error) {
    logger.error('Failed to load model', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/models/:id/test
 * Test inference with a simple prompt
 */
app.post('/api/models/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const { prompt } = req.body;
    const model = storage.getModel(id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    // Get loaded model info
    const modelInfo = orchestrator.getLoadedModelInfo(id);
    if (!modelInfo) {
      return res.status(400).json({ error: 'Model not loaded in Foundry Local' });
    }
    
    const client = orchestrator.getOpenAIClient();
    const testPrompt = prompt || 'Say "Hello, I am working!" in one sentence.';
    const modelName = modelInfo.id;  // Use full ID as required by Foundry Local API
    
    logger.info('Testing model inference', { 
      id, 
      alias: modelInfo.alias,
      modelId: modelInfo.id,
      using: modelName,
      prompt: testPrompt 
    });
    
    const startTime = Date.now();
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [{ role: 'user', content: testPrompt }],
      max_tokens: 50,
      temperature: 0.7
    });
    
    const endTime = Date.now();
    const latency = endTime - startTime;
    
    logger.info('Test inference successful', {
      id,
      alias: modelInfo.alias,
      latency,
      tokens: response.usage?.completion_tokens
    });
    
    res.json({ 
      success: true,
      response: response.choices[0]?.message?.content,
      usage: response.usage,
      latency,
      model: modelInfo.alias
    });
  } catch (error) {
    logger.error('Test inference failed', { 
      id: req.params.id,
      error: error.message,
      status: error.status,
      response: error.response?.data
    });
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data || error.toString()
    });
  }
});

/**
 * GET /api/models/:id/health
 * Check model health (whether loaded in service)
 */
app.get('/api/models/:id/health', async (req, res) => {
  try {
    const { id } = req.params;
    const model = storage.getModel(id);
    
    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }
    
    const health = await orchestrator.checkModelHealth(model.alias || id);
    res.json(health);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/models/:id/logs
 * Get logs for a model service
 */
app.get('/api/models/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const logs = storage.getLogs('service', id, limit);
    res.json({ logs });
  } catch (error) {
    logger.error('Failed to get logs', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Benchmarks API
// ============================================================================

/**
 * GET /api/benchmarks/suites
 * List available benchmark suites
 */
app.get('/api/benchmarks/suites', async (req, res) => {
  try {
    const suitesDir = path.join(__dirname, '../../benchmarks/suites');
    const files = fs.readdirSync(suitesDir).filter(f => f.endsWith('.json'));
    
    const suites = files.map(file => {
      const content = JSON.parse(fs.readFileSync(path.join(suitesDir, file), 'utf8'));
      return {
        name: file.replace('.json', ''),
        ...content
      };
    });
    
    res.json({ suites });
  } catch (error) {
    logger.error('Failed to list benchmark suites', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/benchmarks/run
 * Run a benchmark
 */
app.post('/api/benchmarks/run', async (req, res) => {
  try {
    const { modelIds, suiteName, selectedScenarios, config } = req.body;
    
    if (!modelIds || !Array.isArray(modelIds) || modelIds.length === 0) {
      return res.status(400).json({ error: 'modelIds array is required' });
    }
    
    if (!suiteName) {
      return res.status(400).json({ error: 'suiteName is required' });
    }

    // Load suite
    const suitePath = path.join(__dirname, '../../benchmarks/suites', `${suiteName}.json`);
    if (!fs.existsSync(suitePath)) {
      return res.status(404).json({ error: 'Suite not found' });
    }
    
    const suite = JSON.parse(fs.readFileSync(suitePath, 'utf8'));

    // Filter scenarios if selectedScenarios is provided
    if (selectedScenarios && Array.isArray(selectedScenarios) && selectedScenarios.length > 0) {
      suite.scenarios = suite.scenarios.filter(s => selectedScenarios.includes(s.name));
      logger.info('Running selected scenarios', { 
        total: selectedScenarios.length,
        scenarios: selectedScenarios 
      });
    }

    // Start benchmark (async) and return runId immediately
    const { runId } = await benchmark.runBenchmark(
      modelIds, 
      suiteName, 
      suite, 
      config || {}, 
      (progress) => {
        logger.info('Benchmark progress', progress);
      },
      { returnImmediately: true }
    );

    res.json({ 
      success: true,
      runId,
      message: `Benchmark started with ${suite.scenarios.length} scenario(s)`
    });
  } catch (error) {
    logger.error('Failed to start benchmark', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/benchmarks/runs
 * List all benchmark runs
 */
app.get('/api/benchmarks/runs', async (req, res) => {
  try {
    const runs = storage.getAllBenchmarkRuns();
    res.json({ runs });
  } catch (error) {
    logger.error('Failed to get benchmark runs', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/benchmarks/runs/:id
 * Get specific benchmark run with results
 */
app.get('/api/benchmarks/runs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const run = storage.getBenchmarkRun(id);
    
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    
    const results = storage.getBenchmarkResults(id);
    
    // Enrich results with model alias
    const enrichedResults = results.map(result => {
      const model = storage.getModel(result.model_id);
      return {
        ...result,
        model_alias: model?.alias || result.model_id,
        model_name: model?.alias || 'Unknown Model'
      };
    });
    
    res.json({ run, results: enrichedResults });
  } catch (error) {
    logger.error('Failed to get benchmark run', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/benchmarks/runs/:id/status
 * Get benchmark run status & progress
 */
app.get('/api/benchmarks/runs/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const status = benchmark.getBenchmarkStatus(id);
    const run = storage.getBenchmarkRun(id);

    res.json({
      status: status?.status || run?.status || 'unknown',
      progress: status?.progress ?? null,
      run
    });
  } catch (error) {
    logger.error('Failed to get benchmark status', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/benchmarks/results
 * Get all benchmark results with optional filters
 */
app.get('/api/benchmarks/results', async (req, res) => {
  try {
    const { runId, modelId } = req.query;
    
    let results;
    if (runId) {
      results = storage.getBenchmarkResults(runId);
    } else {
      results = storage.getAllBenchmarkResults();
    }
    
    if (modelId) {
      results = results.filter(r => r.model_id === modelId);
    }
    
    res.json({ results });
  } catch (error) {
    logger.error('Failed to get results', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/benchmarks/runs/:id/export/json
 * Export results as JSON
 */
app.get('/api/benchmarks/runs/:id/export/json', async (req, res) => {
  try {
    const { id } = req.params;
    const data = storage.exportToJSON(id);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="benchmark-${id}.json"`);
    res.json(data);
  } catch (error) {
    logger.error('Failed to export JSON', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/benchmarks/runs/:id/export/csv
 * Export results as CSV
 */
app.get('/api/benchmarks/runs/:id/export/csv', async (req, res) => {
  try {
    const { id } = req.params;
    const csv = storage.exportToCSV(id);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="benchmark-${id}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Failed to export CSV', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/benchmarks/runs/:id/logs
 * Get logs for a benchmark run
 */
app.get('/api/benchmarks/runs/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    const logs = storage.getLogs('benchmark', id, limit);
    res.json({ logs });
  } catch (error) {
    logger.error('Failed to get logs', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// System API
// ============================================================================

/**
 * GET /api/system/health
 * Overall system health check
 */
app.get('/api/system/health', async (req, res) => {
  try {
    const serviceHealth = await orchestrator.checkServiceHealth();
    res.json({ 
      status: serviceHealth.healthy ? 'healthy' : 'unhealthy',
      foundryLocal: serviceHealth.healthy ? 'available' : 'unavailable',
      endpoint: serviceHealth.endpoint,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

/**
 * GET /api/system/stats
 * Get dashboard statistics
 */
app.get('/api/system/stats', async (req, res) => {
  try {
    const models = storage.getAllModels();
    const runs = storage.getAllBenchmarkRuns();
    const results = storage.getAllBenchmarkResults();

    // Calculate best model metrics
    const tpsResults = results.filter(r => r.tps > 0).sort((a, b) => b.tps - a.tps);
    const latencyResults = results.filter(r => r.latency_p95 > 0).sort((a, b) => a.latency_p95 - b.latency_p95);

    const stats = {
      totalModels: models.length,
      runningServices: models.filter(m => m.status === 'running').length,
      totalRuns: runs.length,
      lastRun: runs.length > 0 ? runs[0] : null,
      bestTpsModel: tpsResults.length > 0 ? {
        modelId: tpsResults[0].model_id,
        tps: tpsResults[0].tps
      } : null,
      bestLatencyModel: latencyResults.length > 0 ? {
        modelId: latencyResults[0].model_id,
        p95: latencyResults[0].latency_p95
      } : null
    };

    res.json(stats);
  } catch (error) {
    logger.error('Failed to get stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Serve static client files in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuildPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`FLPerformance API server running on port ${PORT}`);
  logger.info('Initializing Foundry Local...');
  
  orchestrator.initialize()
    .then((info) => logger.info('Foundry Local initialized', info))
    .catch(err => logger.error('Foundry Local initialization failed', { error: err.message }));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close();
  await orchestrator.cleanup();
  storage.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close();
  await orchestrator.cleanup();
  storage.close();
  process.exit(0);
});

export default app;
