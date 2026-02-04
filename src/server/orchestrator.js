import { FoundryLocalManager } from 'foundry-local-sdk';
import OpenAI from 'openai';
import { execFile } from 'child_process';
import { promisify } from 'util';
import logger, { createServiceLogger } from './logger.js';
import storage from './storage.js';
import cacheManager from './cacheManager.js';

const execFilePromise = promisify(execFile);

class FoundryLocalOrchestrator {
  constructor() {
    this.manager = null;
    this.openaiClient = null;
    this.loadedModels = new Map(); // modelId -> FoundryModelInfo
    this.initialized = false;
  }

  /**
   * Initialize and start Foundry Local service
   */
  async initialize() {
    if (this.initialized && this.manager) {
      logger.info('Orchestrator already initialized');
      return {
        endpoint: this.manager.endpoint,
        serviceUrl: this.manager.serviceUrl
      };
    }

    logger.info('Initializing Foundry Local SDK');
    
    try {
      // Create manager instance
      this.manager = new FoundryLocalManager();
      
      // Start the service (single service for all models)
      await this.manager.startService();
      
      logger.info('Foundry Local service started', {
        endpoint: this.manager.endpoint,
        serviceUrl: this.manager.serviceUrl
      });

      // Create OpenAI client (single client for all models)
      this.openaiClient = new OpenAI({
        baseURL: this.manager.endpoint,
        apiKey: this.manager.apiKey
      });

      this.initialized = true;

      return {
        endpoint: this.manager.endpoint,
        serviceUrl: this.manager.serviceUrl
      };
      
    } catch (error) {
      logger.error('Failed to initialize Foundry Local', { error: error.message });
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Check if service is running
   */
  async isServiceRunning() {
    if (!this.manager) {
      return false;
    }
    
    try {
      return await this.manager.isServiceRunning();
    } catch (error) {
      logger.error('Error checking service status', { error: error.message });
      return false;
    }
  }

  /**
   * List available models from catalog and cache
   */
  async listAvailableModels() {
    await this.initialize();

    try {
      // Get catalog models from SDK
      const catalogModels = await this.manager.listCatalogModels();
      logger.info('Catalog models fetched', { count: catalogModels.length });

      // Get models from current cache
      const cacheModels = await cacheManager.listCacheModels();
      logger.info('Cache models fetched', { count: cacheModels.length });

      // Merge and mark custom models
      const mergedModels = this.mergeCatalogAndCache(catalogModels, cacheModels);

      logger.info('Models merged', {
        catalog: catalogModels.length,
        cache: cacheModels.length,
        total: mergedModels.length
      });

      return mergedModels;

    } catch (error) {
      logger.error('Failed to list models', { error: error.message });

      // Return fallback list
      logger.warn('Returning fallback model list');
      return [
        { id: 'phi-3.5-mini', alias: 'phi-3.5-mini', description: 'Phi-3.5 Mini', isCustom: false },
        { id: 'phi-4-mini', alias: 'phi-4-mini', description: 'Phi-4 Mini', isCustom: false },
        { id: 'qwen2.5-0.5b', alias: 'qwen2.5-0.5b', description: 'Qwen 2.5 0.5B', isCustom: false },
        { id: 'llama-3.2-1b', alias: 'llama-3.2-1b', description: 'Llama 3.2 1B', isCustom: false },
        { id: 'llama-3.2-3b', alias: 'llama-3.2-3b', description: 'Llama 3.2 3B', isCustom: false }
      ];
    }
  }

  /**
   * Merge catalog and cache models, marking custom models
   */
  mergeCatalogAndCache(catalogModels, cacheModels) {
    // Transform catalog models
    const transformed = catalogModels.map(m => ({
      id: m.id,
      alias: m.alias,
      description: `${m.alias} (${m.deviceType})`,
      version: m.version,
      deviceType: m.deviceType,
      executionProvider: m.executionProvider,
      modelSize: m.modelSize,
      isCustom: false
    }));

    // Create a set of catalog model IDs for quick lookup
    const catalogIds = new Set(catalogModels.map(m => m.id));
    const catalogAliases = new Set(catalogModels.map(m => m.alias));

    // Add cache models that aren't in the catalog (custom models)
    for (const cacheModel of cacheModels) {
      // Check if this model is not in the catalog
      const isCustom = !catalogIds.has(cacheModel.id) && !catalogAliases.has(cacheModel.alias);

      if (isCustom) {
        // This is a custom model - add it to the list
        transformed.push({
          id: cacheModel.id,
          alias: cacheModel.alias,
          description: `🔧 ${cacheModel.description || cacheModel.alias}`,
          source: 'cache',
          isCustom: true
        });
      }
    }

    return transformed;
  }

  /**
   * List currently loaded models
   */
  async listLoadedModels() {
    await this.initialize();
    
    try {
      const models = await this.manager.listLoadedModels();
      logger.info('Loaded models fetched', { count: models.length });
      return models;
    } catch (error) {
      logger.error('Failed to list loaded models', { error: error.message });
      // Return from cache
      return Array.from(this.loadedModels.values());
    }
  }

  /**
   * Get model info by alias or ID
   */
  async getModelInfo(aliasOrId) {
    await this.initialize();
    
    try {
      const modelInfo = await this.manager.getModelInfo(aliasOrId);
      if (!modelInfo) {
        throw new Error(`Model ${aliasOrId} not found in catalog`);
      }
      return modelInfo;
    } catch (error) {
      logger.error('Failed to get model info', { aliasOrId, error: error.message });
      throw error;
    }
  }

  /**
   * Download a model (if not cached)
   */
  async downloadModel(alias, device = null, onProgress = null) {
    await this.initialize();
    
    const serviceLogger = createServiceLogger(alias);
    
    try {
      serviceLogger.info('Downloading model', { alias, device });
      
      // Download with progress callback
      await this.manager.downloadModel(
        alias,
        device,
        null, // token
        false, // force
        onProgress
      );
      
      serviceLogger.info('Model downloaded', { alias });
      return true;
      
    } catch (error) {
      serviceLogger.error('Download failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Load a model into the service
   * NOTE: This loads the model into the SINGLE Foundry Local service
   */
  async loadModel(modelId, alias, device = null, ttl = 600) {
    await this.initialize();
    
    const serviceLogger = createServiceLogger(alias);
    
    try {
      serviceLogger.info('Loading model', { modelId, alias, device, ttl });
      
      // Try to load model - if not downloaded, it will fail
      try {
        const modelInfo = await this.manager.loadModel(alias, device, ttl);
        
        // Store model info in cache (key by our model ID, not SDK's)
        this.loadedModels.set(modelId, modelInfo);
        
        // Update existing model in storage with SDK details
        const model = storage.getModel(modelId);
        if (model) {
          const updatedModel = {
            ...model,
            status: 'running',
            endpoint: this.manager.endpoint,
            foundry_id: modelInfo.id,
            foundry_alias: modelInfo.alias,
            version: modelInfo.version,
            deviceType: modelInfo.deviceType,
            executionProvider: modelInfo.executionProvider,
            modelSize: modelInfo.modelSize,
            last_error: null,
            last_heartbeat: Date.now(),
            updated_at: Date.now()
          };
          storage.saveModel(updatedModel);
        }
        
        serviceLogger.info('Model loaded', {
          id: modelId,
          foundry_id: modelInfo.id,
          alias: modelInfo.alias,
          deviceType: modelInfo.deviceType,
          executionProvider: modelInfo.executionProvider
        });
        
        return modelInfo;
        
      } catch (loadError) {
        // Check if error is about model not being downloaded
        if (loadError.message && loadError.message.includes('not been downloaded')) {
          serviceLogger.info('Model not downloaded, downloading now...', { alias });
          
          // Update status to downloading
          const model = storage.getModel(modelId);
          if (model) {
            storage.saveModel({
              ...model,
              status: 'downloading',
              last_error: null,
              updated_at: Date.now()
            });
          }
          
          // Download the model first
          await this.downloadModel(alias, device);
          
          serviceLogger.info('Download complete, loading model...', { alias });
          
          // Now try loading again
          const modelInfo = await this.manager.loadModel(alias, device, ttl);
          
          // Store model info in cache
          this.loadedModels.set(modelId, modelInfo);
          
          // Update existing model in storage with SDK details
          if (model) {
            const updatedModel = {
              ...model,
              status: 'running',
              endpoint: this.manager.endpoint,
              foundry_id: modelInfo.id,
              foundry_alias: modelInfo.alias,
              version: modelInfo.version,
              deviceType: modelInfo.deviceType,
              executionProvider: modelInfo.executionProvider,
              modelSize: modelInfo.modelSize,
              last_error: null,
              last_heartbeat: Date.now(),
              updated_at: Date.now()
            };
            storage.saveModel(updatedModel);
          }
          
          serviceLogger.info('Model loaded after download', {
            id: modelId,
            foundry_id: modelInfo.id,
            alias: modelInfo.alias
          });
          
          return modelInfo;
        } else if (loadError.message && loadError.message.includes('not found')) {
          // Model not in catalog - try CLI fallback for custom models
          serviceLogger.info('Model not in catalog, trying CLI fallback for custom model', { alias, ttl });
          
          try {
            // Validate alias to avoid command injection and path traversal
            // Only allow alphanumeric, underscore, and single dashes (not dots to prevent path traversal)
            const aliasPattern = /^[A-Za-z0-9_-]+$/;
            if (!aliasPattern.test(alias)) {
              throw new Error('Invalid model alias for CLI - use only alphanumeric, dash, and underscore characters');
            }

            // Additional check: no double dashes or leading/trailing dashes
            if (alias.startsWith('-') || alias.endsWith('-') || alias.includes('--')) {
              throw new Error('Invalid model alias format');
            }

            serviceLogger.info('Loading custom model via CLI', { alias, ttl });

            const { stdout, stderr } = await execFilePromise(
              'foundry',
              ['model', 'load', alias, '--ttl', String(ttl)]
            );

            if (stderr && !stderr.includes('Service is Started')) {
              serviceLogger.warn('CLI load stderr', { stderr });
            }

            serviceLogger.info('Custom model loaded via CLI', { alias, stdout });

            // Create a basic model info object since CLI doesn't return full details
            const modelInfo = {
              id: alias,
              alias: alias,
              version: 'unknown',
              deviceType: 'unknown',
              executionProvider: 'unknown',
              modelSize: 'unknown'
            };

            // Store model info in cache
            this.loadedModels.set(modelId, modelInfo);

            // Update existing model in storage
            const model = storage.getModel(modelId);
            if (model) {
              const updatedModel = {
                ...model,
                status: 'running',
                endpoint: this.manager.endpoint,
                foundry_id: modelInfo.id,
                foundry_alias: modelInfo.alias,
                last_error: null,
                last_heartbeat: Date.now(),
                updated_at: Date.now()
              };
              storage.saveModel(updatedModel);
            }

            return modelInfo;

          } catch (cliError) {
            serviceLogger.error('CLI fallback failed', { error: cliError.message });
            throw new Error(`Failed to load custom model via CLI: ${cliError.message}`);
          }
        } else {
          // Different error, rethrow
          throw loadError;
        }
      }
      
    } catch (error) {
      serviceLogger.error('Load failed', { error: error.message });
      
      // Update model status to error
      const model = storage.getModel(modelId);
      if (model) {
        storage.saveModel({
          ...model,
          status: 'error',
          last_error: error.message,
          updated_at: Date.now()
        });
      }
      
      throw error;
    }
  }

  /**
   * Unload a model from the service
   */
  async unloadModel(modelId, alias, device = null, force = false) {
    await this.initialize();
    
    const serviceLogger = createServiceLogger(alias);
    
    try {
      serviceLogger.info('Unloading model', { modelId, alias, device, force });
      
      // Get model info to find foundry alias
      const modelInfo = this.loadedModels.get(modelId);
      const foundryAlias = modelInfo?.alias || alias;
      
      // Unload using SDK
      await this.manager.unloadModel(foundryAlias, device, force);
      
      // Remove from cache
      this.loadedModels.delete(modelId);
      
      // Update model status
      const model = storage.getModel(modelId);
      if (model) {
        storage.saveModel({
          ...model,
          status: 'stopped',
          endpoint: null,
          last_heartbeat: Date.now(),
          updated_at: Date.now()
        });
      }
      
      serviceLogger.info('Model unloaded', { modelId, alias });
      
    } catch (error) {
      serviceLogger.error('Unload failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Check service health for a specific model
   */
  async checkModelHealth(aliasOrId) {
    await this.initialize();
    
    try {
      // Check if model is in loaded models
      const loadedModels = await this.listLoadedModels();
      const isLoaded = loadedModels.some(m => 
        m.alias === aliasOrId || m.id === aliasOrId
      );
      
      if (!isLoaded) {
        return {
          status: 'stopped',
          healthy: false,
          endpoint: this.manager.endpoint
        };
      }
      
      // Service is running and model is loaded
      return {
        status: 'running',
        healthy: true,
        endpoint: this.manager.endpoint,
        lastCheck: Date.now()
      };
      
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check overall service health
   */
  async checkServiceHealth() {
    if (!this.initialized || !this.manager) {
      return { status: 'not_initialized', healthy: false };
    }
    
    try {
      const isRunning = await this.manager.isServiceRunning();
      
      if (!isRunning) {
        return { status: 'stopped', healthy: false };
      }
      
      // Try a test request
      try {
        await this.openaiClient.models.list();
      } catch (err) {
        return {
          status: 'error',
          healthy: false,
          error: 'Service running but not responding'
        };
      }
      
      return {
        status: 'running',
        healthy: true,
        endpoint: this.manager.endpoint,
        lastCheck: Date.now()
      };
      
    } catch (error) {
      return {
        status: 'error',
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get OpenAI client for inference
   * NOTE: Single client is used for all models, differentiated by model ID
   */
  getOpenAIClient() {
    if (!this.openaiClient) {
      throw new Error('Orchestrator not initialized. Call initialize() first.');
    }
    return this.openaiClient;
  }

  /**
   * Get endpoint
   */
  getEndpoint() {
    return this.manager?.endpoint || null;
  }

  /**
   * Get loaded model info from cache
   */
  getLoadedModelInfo(modelId) {
    return this.loadedModels.get(modelId) || null;
  }

  /**
   * Get all loaded models from cache
   */
  getAllLoadedModels() {
    return Array.from(this.loadedModels.values());
  }

  /**
   * Cleanup - unload all models
   */
  async cleanup() {
    if (!this.initialized || !this.manager) {
      logger.info('Nothing to cleanup');
      return;
    }
    
    try {
      logger.info('Cleaning up - unloading all models');
      
      const loaded = await this.listLoadedModels();
      
      for (const model of loaded) {
        try {
          await this.unloadModel(model.alias || model.id, null, true);
          logger.info('Unloaded model', { id: model.id });
        } catch (error) {
          logger.error('Error unloading model', { id: model.id, error: error.message });
        }
      }
      
      this.loadedModels.clear();
      logger.info('Cleanup complete');
      
    } catch (error) {
      logger.error('Cleanup error', { error: error.message });
    }
  }
}

export default new FoundryLocalOrchestrator();
