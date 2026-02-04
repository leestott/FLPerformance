import React, { useState, useEffect } from 'react';
import { benchmarksAPI } from '../utils/api';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

function Results() {
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [runProgress, setRunProgress] = useState(0);
  const [initialRunParam, setInitialRunParam] = useState(null);

  useEffect(() => {
    // Parse ?run=<runId>
    const params = new URLSearchParams(window.location.search);
    const runParam = params.get('run');
    if (runParam) {
      setInitialRunParam(runParam);
      setSelectedRun(runParam);
    }
    loadRuns();
  }, []);

  useEffect(() => {
    if (selectedRun) {
      loadResults(selectedRun);
    }
  }, [selectedRun]);

  useEffect(() => {
    if (!selectedRun) return;

    const interval = setInterval(async () => {
      try {
        const res = await benchmarksAPI.status(selectedRun);
        setRunStatus(res.data.status);
        if (res.data.progress !== null && res.data.progress !== undefined) {
          setRunProgress(res.data.progress);
        }
        if (res.data.status === 'completed') {
          clearInterval(interval);
          loadResults(selectedRun);
          loadRuns();
        }
        if (res.data.status === 'failed') {
          clearInterval(interval);
          setError('Benchmark failed. Check logs.');
        }
      } catch (err) {
        console.warn('Failed to poll benchmark status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedRun]);

  const loadRuns = async () => {
    try {
      const res = await benchmarksAPI.getRuns();
      setRuns(res.data.runs);
      if (res.data.runs.length > 0) {
        if (initialRunParam) {
          const exists = res.data.runs.find(r => r.id === initialRunParam);
          setSelectedRun(exists ? initialRunParam : res.data.runs[0].id);
        } else {
          setSelectedRun(prev => prev || res.data.runs[0].id);
        }
      }
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadResults = async (runId) => {
    try {
      const res = await benchmarksAPI.getRun(runId);
      setResults(res.data.results);
      if (res.data.run) {
        setRunStatus(res.data.run.status);
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleExport = async (format) => {
    try {
      const res = format === 'json' 
        ? await benchmarksAPI.exportJSON(selectedRun)
        : await benchmarksAPI.exportCSV(selectedRun);
      
      const blob = new Blob([res.data], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `benchmark-${selectedRun}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  // Aggregate results by model for comparison
  const getModelAggregates = () => {
    const modelMap = {};
    
    results.forEach(result => {
      const modelKey = result.model_alias || result.model_id;
      if (!modelMap[modelKey]) {
        modelMap[modelKey] = {
          model_id: result.model_id,
          model: modelKey,
          tps: [],
          ttft: [],
          tpot: [],
          gen_tps: [],
          latency_p50: [],
          latency_p95: [],
          latency_p99: [],
          error_rate: [],
          scenarios: 0
        };
      }

      if (result.tps) modelMap[modelKey].tps.push(result.tps);
      if (result.ttft) modelMap[modelKey].ttft.push(result.ttft);
      if (result.tpot) modelMap[modelKey].tpot.push(result.tpot);
      if (result.gen_tps) modelMap[modelKey].gen_tps.push(result.gen_tps);
      if (result.latency_p50) modelMap[modelKey].latency_p50.push(result.latency_p50);
      if (result.latency_p95) modelMap[modelKey].latency_p95.push(result.latency_p95);
      if (result.latency_p99) modelMap[modelKey].latency_p99.push(result.latency_p99);
      if (result.error_rate !== null) modelMap[modelKey].error_rate.push(result.error_rate);
      modelMap[modelKey].scenarios++;
    });

    return Object.values(modelMap).map(m => ({
      model: m.model, // Use alias instead of model_id
      avgTps: m.tps.length ? (m.tps.reduce((a, b) => a + b, 0) / m.tps.length).toFixed(2) : 0,
      avgTtft: m.ttft.length ? (m.ttft.reduce((a, b) => a + b, 0) / m.ttft.length).toFixed(2) : 0,
      avgTpot: m.tpot.length ? (m.tpot.reduce((a, b) => a + b, 0) / m.tpot.length).toFixed(2) : 0,
      avgGenTps: m.gen_tps.length ? (m.gen_tps.reduce((a, b) => a + b, 0) / m.gen_tps.length).toFixed(2) : 0,
      avgP50: m.latency_p50.length ? (m.latency_p50.reduce((a, b) => a + b, 0) / m.latency_p50.length).toFixed(0) : 0,
      avgP95: m.latency_p95.length ? (m.latency_p95.reduce((a, b) => a + b, 0) / m.latency_p95.length).toFixed(0) : 0,
      avgP99: m.latency_p99.length ? (m.latency_p99.reduce((a, b) => a + b, 0) / m.latency_p99.length).toFixed(0) : 0,
      avgErrorRate: m.error_rate.length ? (m.error_rate.reduce((a, b) => a + b, 0) / m.error_rate.length).toFixed(2) : 0,
      scenarios: m.scenarios
    }));
  };

  const modelAggregates = results.length > 0 ? getModelAggregates() : [];

  // Get performance rating (0-100 scale)
  const getPerformanceScore = (model) => {
    // Higher TPS is better, lower latency is better, lower error rate is better
    const tpsScore = Math.min((parseFloat(model.avgTps) / 100) * 30, 30); // Max 30 points
    const latencyScore = Math.max(0, 40 - (parseFloat(model.avgP95) / 100)); // Max 40 points (lower is better)
    const errorScore = Math.max(0, 30 - (parseFloat(model.avgErrorRate) * 10)); // Max 30 points
    return Math.min(100, tpsScore + latencyScore + errorScore).toFixed(0);
  };

  // Get color for performance score
  const getScoreColor = (score) => {
    if (score >= 80) return '#27ae60';
    if (score >= 60) return '#3498db';
    if (score >= 40) return '#f39c12';
    return '#e74c3c';
  };

  // Colors for charts
  const COLORS = ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];

  if (loading) return <div className="loading">Loading results...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>Results</h2>

      {error && <div className="error">{error}</div>}

      {runStatus === 'running' && (
        <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" aria-label="Benchmark running" />
          <div style={{ flex: 1 }}>
            <h4 style={{ marginBottom: '0.5rem' }}>Benchmark running...</h4>
            <p style={{ marginBottom: '0.5rem', color: '#7f8c8d' }}>Run ID: <code>{selectedRun}</code></p>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: `${runProgress || 5}%` }} />
            </div>
            <p style={{ marginTop: '0.5rem', color: '#3498db', fontWeight: 'bold' }}>{runProgress || 0}% completed</p>
          </div>
        </div>
      )}

      {runs.length === 0 ? (
        <div className="card">
          <p>No benchmark runs available. Run a benchmark first.</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Select Benchmark Run</label>
                <select
                  className="form-control"
                  value={selectedRun || ''}
                  onChange={(e) => setSelectedRun(e.target.value)}
                  style={{ maxWidth: '600px' }}
                >
                  {runs.map(run => {
                    const modelList = run.model_aliases && run.model_aliases.length > 0
                      ? run.model_aliases.join(', ')
                      : 'Unknown models';
                    const truncatedModels = modelList.length > 40
                      ? modelList.substring(0, 40) + '...'
                      : modelList;
                    const dateStr = new Date(run.started_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const statusBadge = run.status === 'completed' ? '✓' :
                                       run.status === 'running' ? '⏳' :
                                       run.status === 'failed' ? '✗' : '';
                    const statusText = run.status === 'completed' ? 'completed' :
                                      run.status === 'running' ? 'running' :
                                      run.status === 'failed' ? 'failed' : run.status;

                    return (
                      <option key={run.id} value={run.id}>
                        [{truncatedModels}] - {run.suite_name} - {dateStr} {statusBadge} {statusText}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <button className="btn btn-primary" onClick={() => handleExport('json')}>
                  Export JSON
                </button>
                <button className="btn btn-secondary" onClick={() => handleExport('csv')}>
                  Export CSV
                </button>
              </div>
            </div>
          </div>

          {results.length === 0 && selectedRun && (
            <div className="card">
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
                <h3 style={{ marginBottom: '1rem', color: '#e67e22' }}>Benchmark Run Failed</h3>
                <p style={{ color: '#95a5a6', marginBottom: '1.5rem' }}>
                  This benchmark run completed but didn't generate any results.
                  <br />
                  The models likely failed health checks or weren't responding to inference requests.
                </p>
                <div style={{ padding: '1.5rem', background: '#fff3cd', borderRadius: '8px', border: '2px solid #ffc107', marginBottom: '1.5rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: '#856404' }}>🔧 Recent Fixes Applied:</h4>
                  <p style={{ textAlign: 'left', color: '#856404', marginBottom: '1rem' }}>
                    The benchmark system has been updated to fix model identification issues. 
                    <strong> Please restart the backend server</strong> and try again!
                  </p>
                  <h4 style={{ marginBottom: '0.5rem', color: '#856404' }}>✅ To run a successful benchmark:</h4>
                  <ol style={{ textAlign: 'left', color: '#856404', paddingLeft: '1.5rem' }}>
                    <li><strong>Restart backend</strong>: Press Ctrl+C in backend terminal, run <code>npm run server</code></li>
                    <li>Go to <strong>Models</strong> page - ensure models show status: <strong>"running"</strong> (green)</li>
                    <li>Go to <strong>Benchmarks</strong> page</li>
                    <li>Select your <strong>running models</strong> (check boxes)</li>
                    <li>Click <strong>"Run Benchmark"</strong></li>
                    <li>Wait 1-2 minutes for completion</li>
                    <li>Return here to see visualizations! 📊</li>
                  </ol>
                </div>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => window.location.href = '/#/models'}>
                    Go to Models
                  </button>
                  <button className="btn btn-secondary" onClick={() => window.location.href = '/#/benchmarks'}>
                    Go to Benchmarks
                  </button>
                </div>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <>
              {/* Performance Score Cards */}
              <div className="card">
                <div className="card-header">📊 Performance Scores</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem' }}>
                  {modelAggregates.map((model, idx) => {
                    const score = getPerformanceScore(model);
                    const color = getScoreColor(score);
                    return (
                      <div key={idx} style={{ 
                        padding: '1.5rem', 
                        background: 'white', 
                        borderRadius: '8px', 
                        border: `3px solid ${color}`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        textAlign: 'center'
                      }}>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color, marginBottom: '0.5rem' }}>
                          {score}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                          Overall Score
                        </div>
                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#2c3e50', marginBottom: '0.5rem' }}>
                          {model.model}
                        </div>
                        <div style={{ height: '6px', background: '#ecf0f1', borderRadius: '3px', overflow: 'hidden', marginTop: '0.5rem' }}>
                          <div style={{ height: '100%', width: `${score}%`, background: color, transition: 'width 0.3s' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Best Model Cards */}
              <div className="card">
                <div className="card-header">🏆 Best Model For...</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)', borderRadius: '8px', color: 'white', boxShadow: '0 4px 12px rgba(39, 174, 96, 0.3)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🚀</div>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', opacity: 0.9 }}>Highest Throughput</h4>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {[...modelAggregates].sort((a, b) => b.avgTps - a.avgTps)[0]?.avgTps} tps
                    </p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      {[...modelAggregates].sort((a, b) => b.avgTps - a.avgTps)[0]?.model}
                    </p>
                  </div>
                  <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #3498db 0%, #5dade2 100%)', borderRadius: '8px', color: 'white', boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', opacity: 0.9 }}>Lowest Latency (P95)</h4>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {[...modelAggregates].sort((a, b) => a.avgP95 - b.avgP95)[0]?.avgP95} ms
                    </p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      {[...modelAggregates].sort((a, b) => a.avgP95 - b.avgP95)[0]?.model}
                    </p>
                  </div>
                  <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #9b59b6 0%, #bb8fce 100%)', borderRadius: '8px', color: 'white', boxShadow: '0 4px 12px rgba(155, 89, 182, 0.3)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', opacity: 0.9 }}>Most Reliable</h4>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {[...modelAggregates].sort((a, b) => a.avgErrorRate - b.avgErrorRate)[0]?.avgErrorRate}% error
                    </p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      {[...modelAggregates].sort((a, b) => a.avgErrorRate - b.avgErrorRate)[0]?.model}
                    </p>
                  </div>
                  <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #e67e22 0%, #f39c12 100%)', borderRadius: '8px', color: 'white', boxShadow: '0 4px 12px rgba(230, 126, 34, 0.3)' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏱️</div>
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', opacity: 0.9 }}>Fastest First Token</h4>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                      {[...modelAggregates].sort((a, b) => a.avgP50 - b.avgP50)[0]?.avgP50} ms
                    </p>
                    <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                      {[...modelAggregates].sort((a, b) => a.avgP50 - b.avgP50)[0]?.model}
                    </p>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">📈 Model Comparison</div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Score</th>
                      <th>Avg TPS</th>
                      <th>Avg P50 Latency</th>
                      <th>Avg P95 Latency</th>
                      <th>Avg P99 Latency</th>
                      <th>Avg Error Rate</th>
                      <th>Scenarios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelAggregates.map((model, idx) => {
                      const score = getPerformanceScore(model);
                      const color = getScoreColor(score);
                      return (
                        <tr key={idx}>
                          <td><strong>{model.model}</strong></td>
                          <td>
                            <span style={{ 
                              display: 'inline-block',
                              padding: '4px 12px',
                              borderRadius: '12px',
                              background: color,
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}>
                              {score}/100
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 'bold', color: '#27ae60' }}>{model.avgTps}</span> tokens/s
                          </td>
                          <td>{model.avgP50} ms</td>
                          <td>{model.avgP95} ms</td>
                          <td>{model.avgP99} ms</td>
                          <td>
                            <span style={{ 
                              color: parseFloat(model.avgErrorRate) > 5 ? '#e74c3c' : '#27ae60',
                              fontWeight: 'bold'
                            }}>
                              {model.avgErrorRate}%
                            </span>
                          </td>
                          <td>{model.scenarios}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {modelAggregates.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem' }}>
                    <div className="card">
                      <div className="card-header">🚀 Throughput Comparison (TPS)</div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={modelAggregates}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="model" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="avgTps" fill="#27ae60" name="Avg TPS" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card">
                      <div className="card-header">⚡ Latency Comparison (ms)</div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={modelAggregates}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="model" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="avgP50" fill="#3498db" name="P50" />
                          <Bar dataKey="avgP95" fill="#e67e22" name="P95" />
                          <Bar dataKey="avgP99" fill="#e74c3c" name="P99" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="card">
                      <div className="card-header">⏱️ Generation Performance (TPOT & GenTPS)</div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={modelAggregates}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="model" />
                          <YAxis
                            yAxisId="left"
                            orientation="left"
                            label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }}
                          />
                          <YAxis
                            yAxisId="right"
                            orientation="right"
                            label={{ value: 'Tokens/sec', angle: 90, position: 'insideRight' }}
                          />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="avgTtft"
                            yAxisId="left"
                            fill="#9b59b6"
                            name="Avg TTFT (ms)"
                          />
                          <Bar
                            dataKey="avgTpot"
                            yAxisId="left"
                            fill="#1abc9c"
                            name="Avg TPOT (ms)"
                          />
                          <Bar
                            dataKey="avgGenTps"
                            yAxisId="right"
                            fill="#e67e22"
                            name="Avg GenTPS"
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card">
                    <div className="card-header">🎯 Performance Radar Chart</div>
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={[
                        { metric: 'Throughput', ...Object.fromEntries(modelAggregates.map(m => [
                          m.model, 
                          Math.min(100, (parseFloat(m.avgTps) / Math.max(1, ...modelAggregates.map(x => parseFloat(x.avgTps) || 0))) * 100)
                        ])) },
                        { metric: 'Low Latency', ...Object.fromEntries(modelAggregates.map(m => [
                          m.model, 
                          Math.max(0, 100 - (parseFloat(m.avgP95) / Math.max(1, ...modelAggregates.map(x => parseFloat(x.avgP95) || 1))) * 100)
                        ])) },
                        { metric: 'Reliability', ...Object.fromEntries(modelAggregates.map(m => [
                          m.model, 
                          Math.max(0, 100 - parseFloat(m.avgErrorRate))
                        ])) },
                        { metric: 'Consistency', ...Object.fromEntries(modelAggregates.map(m => [
                          m.model, 
                          Math.max(0, 100 - Math.min(100, ((parseFloat(m.avgP99) - parseFloat(m.avgP50)) / Math.max(1, parseFloat(m.avgP95))) * 50))
                        ])) }
                      ]}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        {modelAggregates.map((model, idx) => (
                          <Radar
                            key={idx}
                            name={model.model}
                            dataKey={model.model}
                            stroke={COLORS[idx % COLORS.length]}
                            fill={COLORS[idx % COLORS.length]}
                            fillOpacity={0.3}
                          />
                        ))}
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              <div className="card">
                <div className="card-header">📋 Detailed Results</div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Model</th>
                      <th>Scenario</th>
                      <th>TPS</th>
                      <th>TTFT (ms)</th>
                      <th>TPOT (ms)</th>
                      <th>GenTPS</th>
                      <th>P50 (ms)</th>
                      <th>P95 (ms)</th>
                      <th>P99 (ms)</th>
                      <th>Error %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, idx) => (
                      <tr key={idx}>
                        <td><strong>{result.model_alias || result.model_id}</strong></td>
                        <td>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: '#ecf0f1',
                            fontSize: '0.85rem'
                          }}>
                            {result.scenario}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 'bold', color: '#27ae60' }}>
                            {result.tps?.toFixed(2) || '-'}
                          </span>
                        </td>
                        <td>{result.ttft?.toFixed(0) || '-'}</td>
                        <td>{result.tpot?.toFixed(2) || '-'}</td>
                        <td>
                          <span style={{ fontWeight: 'bold', color: '#e67e22' }}>
                            {result.gen_tps?.toFixed(2) || '-'}
                          </span>
                        </td>
                        <td>{result.latency_p50?.toFixed(0) || '-'}</td>
                        <td>{result.latency_p95?.toFixed(0) || '-'}</td>
                        <td>{result.latency_p99?.toFixed(0) || '-'}</td>
                        <td>
                          <span style={{ 
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            background: (result.error_rate || 0) > 5 ? '#e74c3c' : '#27ae60',
                            color: 'white',
                            fontSize: '0.85rem'
                          }}>
                            {result.error_rate?.toFixed(1) || '0'}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default Results;
