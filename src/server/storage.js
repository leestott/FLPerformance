import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to import better-sqlite3, but fallback to JSON if not available
let Database = null;
try {
  const module = await import('better-sqlite3');
  Database = module.default;
} catch (err) {
  logger.warn('better-sqlite3 not available, using JSON file storage fallback');
}

class Storage {
  constructor() {
    const resultsDir = path.join(__dirname, '../../results');
    
    // Ensure results directory exists
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    if (Database) {
      // Use SQLite database
      const dbPath = path.join(resultsDir, 'benchmarks.db');
      this.db = new Database(dbPath);
      this.initDatabase();
      this.useJson = false;
      logger.info('Database initialized', { path: dbPath });
    } else {
      // Use JSON file storage
      this.jsonPath = path.join(resultsDir, 'storage.json');
      this.data = this.loadJsonData();
      this.useJson = true;
      logger.info('JSON storage initialized', { path: this.jsonPath });
    }
  }

  loadJsonData() {
    if (fs.existsSync(this.jsonPath)) {
      try {
        return JSON.parse(fs.readFileSync(this.jsonPath, 'utf8'));
      } catch (err) {
        logger.error('Failed to load JSON data, using empty data', { error: err.message });
      }
    }
    return {
      models: {},
      benchmark_runs: {},
      benchmark_results: {},
      logs: []
    };
  }

  saveJsonData() {
    if (this.useJson) {
      fs.writeFileSync(this.jsonPath, JSON.stringify(this.data, null, 2), 'utf8');
    }
  }

  initDatabase() {
    // Models table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        alias TEXT NOT NULL,
        model_id TEXT NOT NULL,
        endpoint TEXT,
        status TEXT DEFAULT 'stopped',
        last_error TEXT,
        last_heartbeat INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Benchmark runs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS benchmark_runs (
        id TEXT PRIMARY KEY,
        suite_name TEXT NOT NULL,
        model_ids TEXT NOT NULL,
        config TEXT NOT NULL,
        hardware_info TEXT,
        status TEXT DEFAULT 'running',
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Results table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS benchmark_results (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        scenario TEXT NOT NULL,
        tps REAL,
        ttft REAL,
        latency_p50 REAL,
        latency_p95 REAL,
        latency_p99 REAL,
        error_rate REAL,
        timeout_rate REAL,
        cpu_avg REAL,
        ram_avg REAL,
        gpu_avg REAL,
        raw_data TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (run_id) REFERENCES benchmark_runs(id),
        FOREIGN KEY (model_id) REFERENCES models(id)
      )
    `);

    // Logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
  }

  // Model operations
  saveModel(model) {
    if (this.useJson) {
      const now = Date.now();
      this.data.models[model.id] = {
        ...model,
        created_at: this.data.models[model.id]?.created_at || now,
        updated_at: now
      };
      this.saveJsonData();
    } else {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO models (id, alias, model_id, endpoint, status, last_error, last_heartbeat, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now'))
      `);
      
      stmt.run(
        model.id,
        model.alias,
        model.model_id,
        model.endpoint || null,
        model.status || 'stopped',
        model.last_error || null,
        model.last_heartbeat || null
      );
    }
    
    logger.info('Model saved', { modelId: model.id });
    return model;
  }

  getModel(id) {
    if (this.useJson) {
      return this.data.models[id] || null;
    }
    const stmt = this.db.prepare('SELECT * FROM models WHERE id = ?');
    return stmt.get(id);
  }

  getAllModels() {
    if (this.useJson) {
      return Object.values(this.data.models).sort((a, b) => b.created_at - a.created_at);
    }
    const stmt = this.db.prepare('SELECT * FROM models ORDER BY created_at DESC');
    return stmt.all();
  }

  deleteModel(id) {
    if (this.useJson) {
      delete this.data.models[id];
      this.saveJsonData();
    } else {
      const stmt = this.db.prepare('DELETE FROM models WHERE id = ?');
      stmt.run(id);
    }
    logger.info('Model deleted', { modelId: id });
  }

  updateModelStatus(id, status, endpoint = null, error = null) {
    if (this.useJson) {
      if (this.data.models[id]) {
        this.data.models[id].status = status;
        this.data.models[id].endpoint = endpoint;
        this.data.models[id].last_error = error;
        this.data.models[id].last_heartbeat = Date.now();
        this.data.models[id].updated_at = Date.now();
        this.saveJsonData();
      }
    } else {
      const stmt = this.db.prepare(`
        UPDATE models 
        SET status = ?, endpoint = ?, last_error = ?, last_heartbeat = strftime('%s', 'now'), updated_at = strftime('%s', 'now')
        WHERE id = ?
      `);
      stmt.run(status, endpoint, error, id);
    }
  }

  // Benchmark operations
  saveBenchmarkRun(run) {
    if (this.useJson) {
      this.data.benchmark_runs[run.id] = {
        ...run,
        created_at: Date.now()
      };
      this.saveJsonData();
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO benchmark_runs (id, suite_name, model_ids, config, hardware_info, status, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        run.id,
        run.suite_name,
        JSON.stringify(run.model_ids),
        JSON.stringify(run.config),
        run.hardware_info ? JSON.stringify(run.hardware_info) : null,
        run.status || 'running',
        run.started_at,
        run.completed_at || null
      );
    }
    
    logger.info('Benchmark run saved', { runId: run.id });
    return run;
  }

  updateBenchmarkRun(id, updates) {
    if (this.useJson) {
      if (this.data.benchmark_runs[id]) {
        Object.assign(this.data.benchmark_runs[id], updates);
        this.saveJsonData();
      }
    } else {
      const fields = [];
      const values = [];
      
      if (updates.status !== undefined) {
        fields.push('status = ?');
        values.push(updates.status);
      }
      if (updates.completed_at !== undefined) {
        fields.push('completed_at = ?');
        values.push(updates.completed_at);
      }
      
      if (fields.length === 0) return;
      
      values.push(id);
      const stmt = this.db.prepare(`UPDATE benchmark_runs SET ${fields.join(', ')} WHERE id = ?`);
      stmt.run(...values);
    }
  }

  getBenchmarkRun(id) {
    if (this.useJson) {
      return this.data.benchmark_runs[id] || null;
    }
    const stmt = this.db.prepare('SELECT * FROM benchmark_runs WHERE id = ?');
    const run = stmt.get(id);
    if (run) {
      run.model_ids = JSON.parse(run.model_ids);
      run.config = JSON.parse(run.config);
      run.hardware_info = run.hardware_info ? JSON.parse(run.hardware_info) : null;
    }
    return run;
  }

  getAllBenchmarkRuns() {
    if (this.useJson) {
      return Object.values(this.data.benchmark_runs).sort((a, b) => b.started_at - a.started_at);
    }
    const stmt = this.db.prepare('SELECT * FROM benchmark_runs ORDER BY started_at DESC');
    const runs = stmt.all();
    return runs.map(run => {
      run.model_ids = JSON.parse(run.model_ids);
      run.config = JSON.parse(run.config);
      run.hardware_info = run.hardware_info ? JSON.parse(run.hardware_info) : null;
      return run;
    });
  }

  saveBenchmarkResult(result) {
    if (this.useJson) {
      if (!this.data.benchmark_results[result.run_id]) {
        this.data.benchmark_results[result.run_id] = [];
      }
      this.data.benchmark_results[result.run_id].push({
        ...result,
        created_at: Date.now()
      });
      this.saveJsonData();
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO benchmark_results 
        (id, run_id, model_id, scenario, tps, ttft, latency_p50, latency_p95, latency_p99, 
         error_rate, timeout_rate, cpu_avg, ram_avg, gpu_avg, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        result.id,
        result.run_id,
        result.model_id,
        result.scenario,
        result.tps || null,
        result.ttft || null,
        result.latency_p50 || null,
        result.latency_p95 || null,
        result.latency_p99 || null,
        result.error_rate || null,
        result.timeout_rate || null,
        result.cpu_avg || null,
        result.ram_avg || null,
        result.gpu_avg || null,
        result.raw_data ? JSON.stringify(result.raw_data) : null
      );
    }
    
    logger.info('Benchmark result saved', { resultId: result.id, runId: result.run_id });
  }

  getBenchmarkResults(runId) {
    if (this.useJson) {
      return this.data.benchmark_results[runId] || [];
    }
    const stmt = this.db.prepare('SELECT * FROM benchmark_results WHERE run_id = ?');
    const results = stmt.all(runId);
    return results.map(r => {
      if (r.raw_data) r.raw_data = JSON.parse(r.raw_data);
      return r;
    });
  }

  getAllBenchmarkResults() {
    if (this.useJson) {
      const allResults = [];
      for (const results of Object.values(this.data.benchmark_results)) {
        allResults.push(...results);
      }
      return allResults.sort((a, b) => b.created_at - a.created_at);
    }
    const stmt = this.db.prepare('SELECT * FROM benchmark_results ORDER BY created_at DESC');
    const results = stmt.all();
    return results.map(r => {
      if (r.raw_data) r.raw_data = JSON.parse(r.raw_data);
      return r;
    });
  }

  // Log operations
  saveLog(entityType, entityId, level, message, metadata = null) {
    if (this.useJson) {
      this.data.logs.push({
        id: this.data.logs.length + 1,
        entity_type: entityType,
        entity_id: entityId,
        level,
        message,
        metadata,
        created_at: Date.now()
      });
      // Keep only last 1000 logs
      if (this.data.logs.length > 1000) {
        this.data.logs = this.data.logs.slice(-1000);
      }
      this.saveJsonData();
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO logs (entity_type, entity_id, level, message, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        entityType,
        entityId,
        level,
        message,
        metadata ? JSON.stringify(metadata) : null
      );
    }
  }

  getLogs(entityType, entityId, limit = 100) {
    if (this.useJson) {
      return this.data.logs
        .filter(log => log.entity_type === entityType && log.entity_id === entityId)
        .sort((a, b) => b.created_at - a.created_at)
        .slice(0, limit);
    }
    const stmt = this.db.prepare(`
      SELECT * FROM logs 
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const logs = stmt.all(entityType, entityId, limit);
    return logs.map(log => {
      if (log.metadata) log.metadata = JSON.parse(log.metadata);
      return log;
    });
  }

  // Export operations
  exportToJSON(runId) {
    const run = this.getBenchmarkRun(runId);
    const results = this.getBenchmarkResults(runId);
    
    return {
      run,
      results,
      exported_at: Date.now()
    };
  }

  exportToCSV(runId) {
    const results = this.getBenchmarkResults(runId);
    
    if (results.length === 0) return '';
    
    const headers = Object.keys(results[0]).filter(k => k !== 'raw_data');
    const rows = results.map(r => 
      headers.map(h => {
        const val = r[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val;
      }).join(',')
    );
    
    return [headers.join(','), ...rows].join('\n');
  }

  close() {
    if (!this.useJson && this.db) {
      this.db.close();
    }
  }
}

export default new Storage();
