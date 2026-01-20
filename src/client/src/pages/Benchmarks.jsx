import React, { useState, useEffect } from 'react';
import { modelsAPI, benchmarksAPI } from '../utils/api';

function Benchmarks() {
  const [models, setModels] = useState([]);
  const [suites, setSuites] = useState([]);
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [selectedModels, setSelectedModels] = useState([]);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [recentRuns, setRecentRuns] = useState([]);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState({
    iterations: 5,
    concurrency: 1,
    timeout: 60000, // 60 seconds - increased for ARM/NPU inference
    temperature: 0.7,
    streaming: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadModels();
    loadSuites();
    loadRecentRuns();
    
    // Auto-refresh models and runs every 3 seconds
    const interval = setInterval(() => {
      loadModels();
      loadRecentRuns();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const loadModels = async () => {
    try {
      const res = await modelsAPI.getAll();
      setModels(res.data.models.filter(m => m.status === 'running'));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const loadSuites = async () => {
    try {
      const res = await benchmarksAPI.getSuites();
      setSuites(res.data.suites);
      if (res.data.suites.length > 0) {
        setSelectedSuite(res.data.suites[0].name);
        // Select all scenarios by default
        if (res.data.suites[0].scenarios) {
          setSelectedScenarios(res.data.suites[0].scenarios.map(s => s.name));
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const loadRecentRuns = async () => {
    try {
      const res = await benchmarksAPI.getRuns();
      // Get last 5 runs, sorted by most recent
      const sortedRuns = (res.data.runs || []).sort((a, b) => 
        new Date(b.started_at || b.created_at) - new Date(a.started_at || a.created_at)
      ).slice(0, 5);
      setRecentRuns(sortedRuns);
      
      // Calculate aggregate statistics
      const allRuns = res.data.runs || [];
      const completed = allRuns.filter(r => r.status === 'completed').length;
      const running = allRuns.filter(r => r.status === 'running').length;
      const failed = allRuns.filter(r => r.status === 'failed').length;
      const totalModels = new Set(allRuns.flatMap(r => r.model_ids || [])).size;
      
      setStats({
        totalRuns: allRuns.length,
        completed,
        running,
        failed,
        totalModels
      });
    } catch (err) {
      // Don't show error for failed runs load, just log it
      console.warn('Failed to load recent runs:', err);
    }
  };

  const handleSuiteChange = (suiteName) => {
    setSelectedSuite(suiteName);
    const suite = suites.find(s => s.name === suiteName);
    if (suite?.scenarios) {
      // Select all scenarios by default when switching suites
      setSelectedScenarios(suite.scenarios.map(s => s.name));
    }
  };

  const handleScenarioToggle = (scenarioName) => {
    setSelectedScenarios(prev => 
      prev.includes(scenarioName) 
        ? prev.filter(name => name !== scenarioName)
        : [...prev, scenarioName]
    );
  };

  const handleSelectAllScenarios = () => {
    const suite = suites.find(s => s.name === selectedSuite);
    if (suite?.scenarios) {
      setSelectedScenarios(suite.scenarios.map(s => s.name));
    }
  };

  const handleDeselectAllScenarios = () => {
    setSelectedScenarios([]);
  };

  const handleModelToggle = (modelId) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleRunBenchmark = async (e) => {
    e.preventDefault();
    
    if (selectedModels.length === 0) {
      setError('Please select at least one model');
      return;
    }

    if (!selectedSuite) {
      setError('Please select a benchmark suite');
      return;
    }

    if (selectedScenarios.length === 0) {
      setError('Please select at least one scenario');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await benchmarksAPI.run({
        modelIds: selectedModels,
        suiteName: selectedSuite,
        selectedScenarios: selectedScenarios, // Pass selected scenarios
        config
      });
      setSuccess(`Benchmark started with ${selectedScenarios.length} scenario(s)! View progress in the Results tab.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentSuite = suites.find(s => s.name === selectedSuite);

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>Benchmarks</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Statistics Summary */}
      {stats && stats.totalRuns > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {stats.totalRuns}
            </div>
            <div style={{ fontSize: '1rem', opacity: 0.9 }}>Total Benchmark Runs</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', color: 'white', boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {stats.completed}
            </div>
            <div style={{ fontSize: '1rem', opacity: 0.9 }}>✅ Completed</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)', color: 'white', boxShadow: '0 4px 12px rgba(243, 156, 18, 0.3)' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {stats.running}
            </div>
            <div style={{ fontSize: '1rem', opacity: 0.9 }}>🔄 Running</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)', color: 'white', boxShadow: '0 4px 12px rgba(231, 76, 60, 0.3)' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {stats.failed}
            </div>
            <div style={{ fontSize: '1rem', opacity: 0.9 }}>❌ Failed</div>
          </div>
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)', color: 'white', boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)' }}>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {stats.totalModels}
            </div>
            <div style={{ fontSize: '1rem', opacity: 0.9 }}>🤖 Models Tested</div>
          </div>
        </div>
      )}

      {/* Recent Benchmark Runs */}
      {recentRuns.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-header">📊 Recent Benchmark Runs</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th>Started</th>
                  <th>Suite</th>
                  <th>Models</th>
                  <th>Config</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => {
                  const startTime = new Date(run.started_at || run.created_at);
                  const endTime = run.completed_at ? new Date(run.completed_at) : null;
                  const duration = endTime ? Math.round((endTime - startTime) / 1000) : null;
                  const isRunning = run.status === 'running';
                  const isFailed = run.status === 'failed';
                  const isCompleted = run.status === 'completed';
                  
                  return (
                    <tr key={run.id}>
                      <td style={{ fontSize: '0.85rem' }}>
                        {startTime.toLocaleDateString()} {startTime.toLocaleTimeString()}
                      </td>
                      <td>
                        <strong>{run.suite_name}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                          {run.model_ids?.length || 0} model(s)
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
                        {run.config?.iterations || 0} iter × {run.config?.timeout || 30000}ms timeout
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          background: isRunning ? '#fff3cd' : isCompleted ? '#d4edda' : '#f8d7da',
                          color: isRunning ? '#856404' : isCompleted ? '#155724' : '#721c24',
                          display: 'inline-block'
                        }}>
                          {isRunning && '🔄 Running'}
                          {isCompleted && '✅ Completed'}
                          {isFailed && '❌ Failed'}
                          {!isRunning && !isCompleted && !isFailed && run.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {duration !== null ? `${duration}s` : isRunning ? '...' : '-'}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => window.location.href = `/#/results?run=${run.id}`}
                          style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                        >
                          View Results
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '0.75rem', background: '#f8f9fa', borderTop: '1px solid #dee2e6', fontSize: '0.85rem', color: '#7f8c8d' }}>
            💡 <strong>Tip:</strong> Recent runs are auto-refreshed every 3 seconds. Click "View Results" to see detailed performance metrics and visualizations.
          </div>
        </div>
      )}

      {models.length === 0 && (
        <div className="error">
          No running models available. Please start at least one model service in the Models tab before running benchmarks.
        </div>
      )}

      <form onSubmit={handleRunBenchmark}>
        <div className="card">
          <div className="card-header">Select Benchmark Suite</div>
          <div className="form-group">
            <label className="form-label">Suite</label>
            <select
              className="form-control"
              value={selectedSuite || ''}
              onChange={(e) => handleSuiteChange(e.target.value)}
              required
            >
              {suites.map(suite => (
                <option key={suite.name} value={suite.name}>
                  {suite.name} - {suite.description}
                </option>
              ))}
            </select>
          </div>

          {currentSuite && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ marginBottom: 0 }}>Suite Details</h4>
                <div>
                  <button 
                    type="button"
                    className="btn btn-sm btn-secondary" 
                    onClick={handleSelectAllScenarios}
                    style={{ marginRight: '0.5rem' }}
                  >
                    Select All
                  </button>
                  <button 
                    type="button"
                    className="btn btn-sm btn-secondary" 
                    onClick={handleDeselectAllScenarios}
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <p style={{ marginBottom: '0.5rem', color: '#7f8c8d' }}>
                {currentSuite.description}
              </p>
              <p style={{ marginBottom: '1rem' }}>
                <strong>Available Scenarios:</strong> {currentSuite.scenarios?.length || 0} | 
                <strong style={{ color: '#27ae60', marginLeft: '0.5rem' }}>
                  Selected: {selectedScenarios.length}
                </strong>
              </p>
              {currentSuite.scenarios && (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {currentSuite.scenarios.map((scenario, idx) => (
                    <label 
                      key={idx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'flex-start',
                        padding: '0.75rem',
                        background: 'white',
                        borderRadius: '4px',
                        border: selectedScenarios.includes(scenario.name) ? '2px solid #3498db' : '1px solid #dee2e6',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedScenarios.includes(scenario.name)}
                        onChange={() => handleScenarioToggle(scenario.name)}
                        style={{ marginRight: '0.75rem', marginTop: '0.25rem' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                          {scenario.name}
                          <span style={{ 
                            marginLeft: '0.5rem',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: scenario.expected_output_length === 'short' ? '#d4edda' : 
                                        scenario.expected_output_length === 'medium' ? '#fff3cd' : '#f8d7da',
                            color: scenario.expected_output_length === 'short' ? '#155724' : 
                                   scenario.expected_output_length === 'medium' ? '#856404' : '#721c24',
                            fontSize: '0.75rem',
                            fontWeight: 'normal'
                          }}>
                            {scenario.expected_output_length}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#7f8c8d', marginBottom: '0.25rem' }}>
                          {scenario.description}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#95a5a6', fontStyle: 'italic' }}>
                          "{scenario.prompt.substring(0, 80)}{scenario.prompt.length > 80 ? '...' : ''}"
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#bdc3c7', marginTop: '0.25rem' }}>
                          Max tokens: {scenario.max_tokens}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">Select Models</div>
          <p style={{ marginBottom: '1rem', color: '#7f8c8d' }}>
            Select one or more models to benchmark (only running services are shown):
          </p>
          {models.length === 0 ? (
            <p style={{ color: '#e74c3c' }}>No running models available</p>
          ) : (
            <div>
              {models.map(model => (
                <div key={model.id} style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id={`model-${model.id}`}
                    checked={selectedModels.includes(model.id)}
                    onChange={() => handleModelToggle(model.id)}
                    style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
                  />
                  <label htmlFor={`model-${model.id}`} style={{ cursor: 'pointer' }}>
                    <strong>{model.alias}</strong> ({model.model_id}) - {model.endpoint}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">Configuration</div>
          <div className="form-group">
            <label className="form-label">
              Iterations per Scenario
              <span style={{ color: '#7f8c8d', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                (Number of times to run each scenario)
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              value={config.iterations}
              onChange={(e) => setConfig({ ...config, iterations: parseInt(e.target.value) })}
              min="1"
              max="100"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Timeout (ms)
              <span style={{ color: '#7f8c8d', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                (Maximum time to wait for a response)
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              value={config.timeout}
              onChange={(e) => setConfig({ ...config, timeout: parseInt(e.target.value) })}
              min="5000"
              max="120000"
              step="1000"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Temperature
              <span style={{ color: '#7f8c8d', fontWeight: 'normal', marginLeft: '0.5rem' }}>
                (0.0 = deterministic, 1.0 = creative)
              </span>
            </label>
            <input
              type="number"
              className="form-control"
              value={config.temperature}
              onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
              min="0"
              max="2"
              step="0.1"
              required
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.streaming}
                onChange={(e) => setConfig({ ...config, streaming: e.target.checked })}
                style={{ marginRight: '0.5rem', width: '18px', height: '18px' }}
              />
              <span className="form-label" style={{ marginBottom: 0 }}>
                Enable Streaming (for TTFT measurement)
              </span>
            </label>
          </div>
        </div>

        <div className="card">
          <button 
            type="submit" 
            className="btn btn-success" 
            disabled={loading || models.length === 0 || selectedModels.length === 0}
          >
            {loading ? 'Starting Benchmark...' : 'Run Benchmark'}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => setSelectedModels([])}
          >
            Clear Selection
          </button>
        </div>
      </form>
    </div>
  );
}

export default Benchmarks;
