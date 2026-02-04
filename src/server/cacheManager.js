import { exec } from 'child_process';
import { promisify } from 'util';
import logger from './logger.js';

const execPromise = promisify(exec);

class CacheManager {
  constructor() {
    this.defaultCachePath = null;
  }

  /**
   * Get current cache directory location
   */
  async getCurrentLocation() {
    try {
      logger.info('Getting current cache location');
      const { stdout, stderr } = await execPromise('foundry cache location');

      if (stderr && !stderr.includes('Service is Started')) {
        logger.warn('Cache location command stderr', { stderr });
      }

      // Parse output: "💾 Cache directory path: /path/to/cache"
      const match = stdout.match(/Cache directory path:\s*(.+)/);
      if (match && match[1]) {
        const location = match[1].trim();

        // Store default cache path on first call
        if (!this.defaultCachePath) {
          this.defaultCachePath = location;
          logger.info('Stored default cache path', { path: this.defaultCachePath });
        }

        return location;
      }

      throw new Error('Could not parse cache location from output');

    } catch (error) {
      logger.error('Failed to get cache location', { error: error.message });
      throw new Error(`Failed to get cache location: ${error.message}`);
    }
  }

  /**
   * Get default cache path (stored on first read)
   */
  getDefaultPath() {
    return this.defaultCachePath;
  }

  /**
   * Switch to a different cache directory
   * @param {string} path - Path to cache directory, or "default" to restore original
   */
  async switchCache(path) {
    try {
      // Handle "default" keyword
      if (path === 'default') {
        if (!this.defaultCachePath) {
          // Try to get it first
          await this.getCurrentLocation();
        }
        path = this.defaultCachePath;
      }

      logger.info('Switching cache directory', { path });
      const { stdout, stderr } = await execPromise(`foundry cache cd "${path}"`);

      if (stderr && !stderr.includes('Service is Started')) {
        logger.warn('Cache switch command stderr', { stderr });
      }

      // Verify the switch worked
      const newLocation = await this.getCurrentLocation();

      logger.info('Cache directory switched', {
        requested: path,
        actual: newLocation
      });

      return {
        success: true,
        location: newLocation,
        isDefault: newLocation === this.defaultCachePath
      };

    } catch (error) {
      logger.error('Failed to switch cache', { path, error: error.message });
      throw new Error(`Failed to switch cache: ${error.message}`);
    }
  }

  /**
   * List models in current cache
   */
  async listCacheModels() {
    try {
      logger.info('Listing models in cache');
      const { stdout, stderr } = await execPromise('foundry cache ls');

      if (stderr && !stderr.includes('Service is Started')) {
        logger.warn('Cache list command stderr', { stderr });
      }

      // Parse output:
      // Models cached on device:
      //    Alias                                             Model ID
      // 💾 phi-3.5-mini                                      Phi-3.5-mini-instruct-generic-cpu:1
      // 💾 rakuten-ai-7b-onnx                                rakuten-ai-7b-onnx

      const models = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        // Skip header lines and empty lines
        if (!line.includes('💾') || line.includes('Alias')) continue;

        // Parse model line: "💾 alias                    model_id"
        const parts = line.trim().split(/\s{2,}/); // Split by 2+ spaces
        if (parts.length >= 2) {
          // Format after split: ["💾 alias", "model_id"]
          // Remove emoji from first part
          const aliasPart = parts[0].replace('💾', '').trim();
          const id = parts[1].trim();

          models.push({
            alias: aliasPart,
            id,
            description: aliasPart,
            source: 'cache'
          });
        }
      }

      logger.info('Cache models listed', { count: models.length });
      return models;

    } catch (error) {
      logger.error('Failed to list cache models', { error: error.message });
      // Don't throw - return empty array as fallback
      logger.warn('Returning empty cache models list');
      return [];
    }
  }

  /**
   * Check if foundry CLI is available
   */
  async checkCLIAvailable() {
    try {
      await execPromise('which foundry');
      return true;
    } catch (error) {
      logger.error('Foundry CLI not found in PATH');
      return false;
    }
  }
}

export default new CacheManager();
