import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import logger from './logger.js';

const execFilePromise = promisify(execFile);

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
      const { stdout, stderr } = await execFilePromise('foundry', ['cache', 'location']);

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
   * Validate cache path to prevent command injection and path traversal
   */
  validateCachePath(cachePath) {
    if (!cachePath || typeof cachePath !== 'string') {
      throw new Error('Cache path must be a non-empty string');
    }

    // Check for null bytes which can be used for injection
    if (cachePath.includes('\0')) {
      throw new Error('Cache path contains invalid characters');
    }

    // Normalize and resolve to absolute path
    const normalized = path.resolve(cachePath);

    // Additional security: prevent access to sensitive system directories
    const sensitivePatterns = [
      /^\/etc($|\/)/i,
      /^\/sys($|\/)/i,
      /^\/proc($|\/)/i,
      /^\/root($|\/)/i,
      /^\/var\/root($|\/)/i,
      /^\/bin($|\/)/i,
      /^\/sbin($|\/)/i,
      /^C:\\Windows($|\\)/i,
      /^C:\\Program Files($|\\)/i,
      /^C:\\Program Files \(x86\)($|\\)/i
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(normalized)) {
        throw new Error('Cache path cannot point to system directories');
      }
    }

    return normalized;
  }

  /**
   * Switch to a different cache directory
   * @param {string} cachePath - Path to cache directory, or "default" to restore original
   */
  async switchCache(cachePath) {
    try {
      let targetPath = cachePath;

      // Handle "default" keyword
      if (targetPath === 'default') {
        if (!this.defaultCachePath) {
          // Try to get it first
          await this.getCurrentLocation();
        }
        targetPath = this.defaultCachePath;
      }

      // Validate and normalize path for cross-platform compatibility
      const normalizedPath = this.validateCachePath(targetPath);

      logger.info('Switching cache directory', { targetPath, normalizedPath });
      
      // Use execFile with args array to prevent command injection
      const { stderr } = await execFilePromise('foundry', ['cache', 'cd', normalizedPath]);

      if (stderr && !stderr.includes('Service is Started')) {
        logger.warn('Cache switch command stderr', { stderr });
      }

      // Verify the switch worked
      const newLocation = await this.getCurrentLocation();

      logger.info('Cache directory switched', {
        requested: normalizedPath,
        actual: newLocation
      });

      return {
        success: true,
        location: newLocation,
        isDefault: newLocation === this.defaultCachePath
      };

    } catch (error) {
      logger.error('Failed to switch cache', { cachePath, error: error.message });
      throw new Error(`Failed to switch cache: ${error.message}`);
    }
  }

  /**
   * List models in current cache
   */
  async listCacheModels() {
    try {
      logger.info('Listing models in cache');
      const { stdout, stderr } = await execFilePromise('foundry', ['cache', 'ls']);

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
      const command = process.platform === 'win32' ? 'where' : 'which';
      await execFilePromise(command, ['foundry']);
      return true;
    } catch (error) {
      logger.error('Foundry CLI not found in PATH');
      return false;
    }
  }
}

export default new CacheManager();
