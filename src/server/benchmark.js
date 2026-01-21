import { performance } from 'perf_hooks';
import si from 'systeminformation';
import { v4 as uuidv4 } from 'uuid';
import logger, { createBenchmarkLogger } from './logger.js';
import storage from './storage.js';
import orchestrator from './orchestrator.js';

class BenchmarkEngine {
  constructor() {
    this.runningBenchmarks = new Map();
  }

  /**
   * Calculate percentiles from sorted array
   */
  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Collect system resource metrics
   */
  async collectResourceMetrics() {
    try {
      const [cpu, mem, graphics] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.graphics().catch(() => ({ controllers: [] }))
      ]);

      return {
        cpu: cpu.currentLoad,
        ram: (mem.used / mem.total) * 100,
        gpu: graphics.controllers[0]?.utilizationGpu || null
      };
    } catch (error) {
      logger.warn('Failed to collect resource metrics', { error: error.message });
      return { cpu: null, ram: null, gpu: null };
    }
  }

  /**
   * Get hardware info for run metadata
   */
  async getHardwareInfo() {
    try {
      const [cpu, mem, graphics, os] = await Promise.all([
        si.cpu(),
        si.mem(),
        si.graphics().catch(() => ({ controllers: [] })),
        si.osInfo()
      ]);

      return {
        cpu: {
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cores: cpu.cores,
          physicalCores: cpu.physicalCores
        },
        memory: {
          total: Math.round(mem.total / (1024 ** 3)) + ' GB'
        },
        gpu: graphics.controllers[0] ? {
          model: graphics.controllers[0].model,
          vram: graphics.controllers[0].vram + ' MB'
        } : null,
        os: {
          platform: os.platform,
          distro: os.distro,
          release: os.release,
          arch: os.arch
        }
      };
    } catch (error) {
      logger.warn('Failed to collect hardware info', { error: error.message });
      return null;
    }
  }

  /**
   * Run a single inference and measure metrics
   * @param {Object} modelInfo - Model info from Foundry Local SDK
   * @param {Object} scenario - Benchmark scenario
   * @param {Object} config - Benchmark configuration
   */
  async runSingleInference(modelInfo, scenario, config) {
    const metrics = {
      startTime: performance.now(),
      endTime: null,
      ttft: null,
      tokens: 0,
      interTokenDelays: [],
      error: null,
      timeout: false
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        metrics.timeout = true;
      }, config.timeout || 30000);

      const startTime = Date.now();
      let firstTokenTime = null;
      let lastTokenTime = null;

      // Get OpenAI client from orchestrator
      const client = orchestrator.getOpenAIClient();

      // Select model identifier: use id (full model identifier) as it's required by Foundry Local OpenAI API
      const modelName = modelInfo.id;

      // Log the model being used for debugging
      logger.info('Running inference', { modelName, modelAlias: modelInfo.alias, scenario: scenario.name });

      // Use streaming to measure TTFT if enabled
      if (config.streaming) {
        const stream = await client.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: scenario.prompt }],
          max_tokens: scenario.max_tokens || 100,
          temperature: config.temperature || 0.7,
          stream: true
        }, { signal: controller.signal });

        for await (const chunk of stream) {
          if (chunk.choices[0]?.delta?.content) {
            const currentTokenTime = Date.now();

            if (!firstTokenTime) {
              // First token: record TTFT
              firstTokenTime = currentTokenTime;
              metrics.ttft = firstTokenTime - startTime;
              lastTokenTime = currentTokenTime;
            } else {
              // Subsequent tokens: calculate inter-token delay
              const interTokenDelay = currentTokenTime - lastTokenTime;
              metrics.interTokenDelays.push(interTokenDelay);
              lastTokenTime = currentTokenTime;
            }

            metrics.tokens++;
          }
        }
      } else {
        // Non-streaming inference
        const response = await client.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: scenario.prompt }],
          max_tokens: scenario.max_tokens || 100,
          temperature: config.temperature || 0.7
        }, { signal: controller.signal });

        metrics.tokens = response.usage?.completion_tokens || 0;
        metrics.ttft = null; // Can't measure TTFT without streaming
      }

      clearTimeout(timeoutId);
      metrics.endTime = performance.now();

    } catch (error) {
      metrics.error = error.message;
      metrics.endTime = performance.now();
      
      // Log detailed error information
      logger.error('Inference failed', {
        modelName,
        modelAlias: modelInfo.alias,
        modelId: modelInfo.id,
        scenario: scenario.name,
        error: error.message,
        errorType: error.constructor.name,
        status: error.status,
        response: error.response?.data,
        stack: error.stack
      });
    }

    return metrics;
  }

  /**
   * Run benchmark scenario for a model
   */
  async runScenario(modelId, scenario, config, progressCallback) {
    const benchmarkLogger = createBenchmarkLogger(modelId);
    
    // Get model info from storage first
    const model = storage.getModel(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found in storage.`);
    }
    
    // Get model info from orchestrator (loaded model info)
    const modelInfo = orchestrator.getLoadedModelInfo(modelId);
    
    if (!modelInfo) {
      throw new Error(`Model ${modelId} not loaded in Foundry Local. Please load the model first.`);
    }

    benchmarkLogger.info('Running scenario', { 
      scenario: scenario.name,
      iterations: config.iterations,
      modelAlias: modelInfo.alias,
      modelId: model.model_id
    });

    const results = {
      iterations: [],
      latencies: [],
      ttfts: [],
      tokenCounts: [],
      allInterTokenDelays: [],
      errors: 0,
      timeouts: 0,
      resourceSnapshots: []
    };

    // Run iterations
    for (let i = 0; i < config.iterations; i++) {
      if (progressCallback) {
        progressCallback({
          modelId,
          scenario: scenario.name,
          iteration: i + 1,
          total: config.iterations
        });
      }

      // Collect resource metrics before inference
      const resourcesBefore = await this.collectResourceMetrics();
      
      // Run inference with modelInfo
      const metrics = await this.runSingleInference(modelInfo, scenario, config);
      
      // Collect resource metrics after inference
      const resourcesAfter = await this.collectResourceMetrics();

      const latency = metrics.endTime - metrics.startTime;
      
      results.iterations.push(metrics);

      if (!metrics.error && !metrics.timeout) {
        results.latencies.push(latency);
        if (metrics.ttft !== null) {
          results.ttfts.push(metrics.ttft);
        }
        results.tokenCounts.push(metrics.tokens);

        // Collect inter-token delays for TPOT calculation
        if (metrics.interTokenDelays.length > 0) {
          results.allInterTokenDelays.push(...metrics.interTokenDelays);
        }
      }

      if (metrics.error) results.errors++;
      if (metrics.timeout) results.timeouts++;

      results.resourceSnapshots.push({
        before: resourcesBefore,
        after: resourcesAfter
      });

      // Small delay between iterations
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate aggregate metrics
    const sortedLatencies = [...results.latencies].sort((a, b) => a - b);
    const sortedTtfts = [...results.ttfts].sort((a, b) => a - b);

    const totalTokens = results.tokenCounts.reduce((sum, t) => sum + t, 0);
    const totalTime = results.latencies.reduce((sum, t) => sum + t, 0) / 1000; // Convert to seconds
    const tps = totalTime > 0 ? totalTokens / totalTime : 0;

    // Calculate TPOT (Time Per Output Token) - average inter-token delay in ms
    const tpot = results.allInterTokenDelays.length > 0
      ? results.allInterTokenDelays.reduce((sum, t) => sum + t, 0) / results.allInterTokenDelays.length
      : null;

    // Calculate GenTPS (Generation Tokens Per Second) - 1000/TPOT
    const gen_tps = tpot > 0 ? 1000 / tpot : null;

    const avgCpu = results.resourceSnapshots
      .filter(r => r.after.cpu !== null)
      .reduce((sum, r) => sum + r.after.cpu, 0) / results.resourceSnapshots.length || null;
    
    const avgRam = results.resourceSnapshots
      .filter(r => r.after.ram !== null)
      .reduce((sum, r) => sum + r.after.ram, 0) / results.resourceSnapshots.length || null;
    
    const avgGpu = results.resourceSnapshots
      .filter(r => r.after.gpu !== null)
      .reduce((sum, r) => sum + r.after.gpu, 0) / 
      results.resourceSnapshots.filter(r => r.after.gpu !== null).length || null;

    const aggregated = {
      tps,
      ttft: sortedTtfts.length > 0 ? sortedTtfts[Math.floor(sortedTtfts.length / 2)] : null,
      tpot,
      gen_tps,
      latency_p50: this.calculatePercentile(sortedLatencies, 50),
      latency_p95: this.calculatePercentile(sortedLatencies, 95),
      latency_p99: this.calculatePercentile(sortedLatencies, 99),
      error_rate: (results.errors / config.iterations) * 100,
      timeout_rate: (results.timeouts / config.iterations) * 100,
      cpu_avg: avgCpu,
      ram_avg: avgRam,
      gpu_avg: avgGpu,
      total_tokens: totalTokens,
      total_iterations: config.iterations,
      successful_iterations: config.iterations - results.errors - results.timeouts
    };

    benchmarkLogger.info('Scenario completed', { 
      scenario: scenario.name,
      tps: aggregated.tps.toFixed(2),
      p50: aggregated.latency_p50.toFixed(2)
    });

    return {
      aggregated,
      raw: results
    };
  }

  /**
   * Run complete benchmark suite
   */
  async runBenchmark(modelIds, suiteName, suite, config, progressCallback, options = { returnImmediately: false }) {
    const runId = uuidv4();
    const benchmarkLogger = createBenchmarkLogger(runId);
    
    benchmarkLogger.info('Starting benchmark run', { 
      runId, 
      models: modelIds,
      suite: suiteName 
    });

    // Initialize running state
    this.runningBenchmarks.set(runId, {
      id: runId,
      status: 'running',
      progress: 0
    });

    const runTask = async () => {
      try {
        // Collect hardware info
        const hardwareInfo = await this.getHardwareInfo();

        // Save benchmark run
        const run = {
          id: runId,
          suite_name: suiteName,
          model_ids: modelIds,
          config,
          hardware_info: hardwareInfo,
          status: 'running',
          started_at: Date.now()
        };
        
        storage.saveBenchmarkRun(run);

        const allResults = [];
        const totalTasks = modelIds.length * (suite.scenarios?.length || 0);
        let completedTasks = 0;

        // Helper to ensure model is loaded and healthy
        const ensureModelReady = async (modelId, model) => {
          // Try cache first
          let modelInfo = orchestrator.getLoadedModelInfo(modelId);

          if (!modelInfo) {
            benchmarkLogger.warn('Model not loaded in cache, attempting to load', { modelId, alias: model.alias, model_id: model.model_id });
            try {
              // Use model_id first (contains device-specific variant)
              modelInfo = await orchestrator.loadModel(modelId, model.model_id || model.alias);
            } catch (err) {
              benchmarkLogger.error('Auto-load failed', { modelId, error: err.message });
              storage.saveLog('benchmark', runId, 'error', `Auto-load failed for ${model.model_id || model.alias}: ${err.message}`);
              return null;
            }
          }

          // Health check
          let health = await orchestrator.checkModelHealth(modelInfo.alias || model.alias || model.model_id);
          if (!health.healthy) {
            benchmarkLogger.warn('Model unhealthy, retrying load', { modelId, alias: modelInfo.alias, health });
            try {
              // Use model_id first (contains device-specific variant)
              await orchestrator.loadModel(modelId, model.model_id || model.alias);
              health = await orchestrator.checkModelHealth(modelInfo.alias || model.alias || model.model_id);
            } catch (err) {
              benchmarkLogger.error('Reload failed', { modelId, error: err.message });
            }
          }

          if (!health.healthy) {
            storage.saveLog('benchmark', runId, 'error', `Model ${modelInfo.alias || model.alias} (${modelId}) service is unhealthy: ${health.error || health.status}`);
            return null;
          }

          return modelInfo;
        };

        // Helper to update progress
        const updateProgress = () => {
          const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          this.runningBenchmarks.set(runId, {
            id: runId,
            status: 'running',
            progress
          });
          if (progressCallback) {
            progressCallback({ runId, progress });
          }
        };

        // Run benchmarks for each model
        for (const modelId of modelIds) {
          benchmarkLogger.info('Benchmarking model', { modelId });

          // Get model from storage to get alias
          const model = storage.getModel(modelId);
          if (!model) {
            benchmarkLogger.error('Model not found in storage', { modelId });
            storage.saveLog('benchmark', runId, 'error', 
              `Model ${modelId} not found in storage`
            );
            continue;
          }

          const modelInfo = await ensureModelReady(modelId, model);
          if (!modelInfo) {
            benchmarkLogger.error('Model not ready, skipping', { modelId, alias: model.alias });
            continue;
          }

          benchmarkLogger.info('Model ready', {
            modelId,
            alias: modelInfo.alias,
            endpoint: orchestrator.getEndpoint()
          });

          // Run each scenario in the suite
          for (const scenario of suite.scenarios) {
            try {
              const result = await this.runScenario(
                modelId, 
                scenario, 
                config,
                progressCallback
              );

              // Save result
              const resultRecord = {
                id: uuidv4(),
                run_id: runId,
                model_id: modelId,
                scenario: scenario.name,
                ...result.aggregated,
                raw_data: result.raw
              };

              storage.saveBenchmarkResult(resultRecord);
              allResults.push(resultRecord);

            } catch (error) {
              benchmarkLogger.error('Scenario failed', { 
                modelId, 
                scenario: scenario.name,
                error: error.message 
              });
              
              storage.saveLog('benchmark', runId, 'error', 
                `Scenario ${scenario.name} failed for ${modelId}: ${error.message}`
              );
            } finally {
              completedTasks += 1;
              updateProgress();
            }
          }
        }

        // Update run as completed
        storage.updateBenchmarkRun(runId, {
          status: 'completed',
          completed_at: Date.now()
        });

        this.runningBenchmarks.set(runId, {
          id: runId,
          status: 'completed',
          progress: 100
        });

        benchmarkLogger.info('Benchmark run completed', { runId, resultsCount: allResults.length });

        return {
          runId,
          results: allResults
        };

      } catch (error) {
        benchmarkLogger.error('Benchmark run failed', { runId, error: error.message });
        
        storage.updateBenchmarkRun(runId, {
          status: 'failed',
          completed_at: Date.now()
        });

        this.runningBenchmarks.set(runId, {
          id: runId,
          status: 'failed',
          progress: 0,
          error: error.message
        });

        throw error;
      }
    };

    if (options.returnImmediately) {
      // Fire and forget
      runTask();
      return { runId };
    }

    return await runTask();
  }

  /**
   * Get benchmark run status
   */
  getBenchmarkStatus(runId) {
    return this.runningBenchmarks.get(runId);
  }
}

export default new BenchmarkEngine();
