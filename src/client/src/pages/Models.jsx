import React, { useState, useEffect, useMemo } from 'react';
import { modelsAPI } from '../utils/api';

function Models() {
  const [models, setModels] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const [logs, setLogs] = useState([]);
  const [newModel, setNewModel] = useState({ alias: '', model_id: '' });

  // Memoize model filtering to avoid recalculation on every render
  const { catalogModels, customModels } = useMemo(() => {
    const catalog = availableModels.filter(m => !m.isCustom);
    const custom = availableModels.filter(m => m.isCustom);
    return { catalogModels: catalog, customModels: custom };
  }, [availableModels]);

  useEffect(() => {
    loadModels();
    loadAvailableModels();
    
    // Auto-refresh every 3 seconds to show status updates
    const interval = setInterval(() => {
      loadModels();
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const loadModels = async () => {
    try {
      const res = await modelsAPI.getAll();
      setModels(res.data.models);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const res = await modelsAPI.getAvailable();
      setAvailableModels(res.data.models);
    } catch (err) {
      console.error('Failed to load available models:', err);
    }
  };

  const handleAddModel = async (e) => {
    e.preventDefault();
    try {
      await modelsAPI.add(newModel);
      setSuccess('Model added successfully');
      setShowAddModal(false);
      setNewModel({ alias: '', model_id: '' });
      loadModels();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleDeleteModel = async (id) => {
    if (!confirm('Are you sure you want to delete this model?')) return;
    try {
      await modelsAPI.delete(id);
      setSuccess('Model deleted successfully');
      loadModels();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleStartService = async (id) => {
    try {
      setSuccess('Loading model... First-time download may take 2-5 minutes.');
      await modelsAPI.start(id);
      setSuccess('Model loaded and running!');
      loadModels();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      loadModels(); // Refresh to show error status
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleStopService = async (id) => {
    try {
      setSuccess('Unloading model...');
      await modelsAPI.stop(id);
      setSuccess('Model stopped successfully');
      loadModels();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleLoadModel = async (id) => {
    try {
      setSuccess('Loading model... this may take a while on first download');
      await modelsAPI.load(id);
      setSuccess('Model loaded successfully');
      loadModels();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleViewLogs = async (model) => {
    try {
      const res = await modelsAPI.logs(model.id);
      setLogs(res.data.logs);
      setSelectedModel(model);
      setShowLogsModal(true);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleTestModel = async (model) => {
    try {
      setSuccess('Testing model inference...');
      const res = await modelsAPI.test(model.id, { prompt: 'Say hello in one sentence.' });
      setSuccess(`✅ Test successful! Response: "${res.data.response}" (${res.data.latency}ms)`);
      setTimeout(() => setSuccess(null), 8000);
    } catch (err) {
      setError(`❌ Test failed: ${err.response?.data?.error || err.message}`);
      setTimeout(() => setError(null), 8000);
    }
  };

  const getStatusBadge = (status) => {
    const badgeClass = {
      running: 'badge-success',
      stopped: 'badge-warning',
      downloading: 'badge-info',
      error: 'badge-danger'
    }[status] || 'badge-info';
    
    const displayStatus = status === 'downloading' ? 'Downloading...' : status;
    
    return <span className={`badge ${badgeClass}`}>{displayStatus}</span>;
  };

  if (loading) return <div className="loading">Loading models...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>Models</h2>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="card-header" style={{ marginBottom: 0, paddingBottom: 0, border: 'none' }}>
            Configured Models
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Add Model
          </button>
        </div>

        {models.length === 0 ? (
          <p style={{ color: '#7f8c8d', padding: '1rem 0' }}>
            No models configured. Click "Add Model" to get started.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Alias</th>
                <th>Model ID</th>
                <th>Status</th>
                <th>Endpoint</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map(model => (
                <tr key={model.id}>
                  <td><strong>{model.alias}</strong></td>
                  <td><code>{model.model_id}</code></td>
                  <td>{getStatusBadge(model.status)}</td>
                  <td>{model.endpoint || '-'}</td>
                  <td>
                    {model.status === 'stopped' || model.status === 'error' ? (
                      <button 
                        className="btn btn-success" 
                        onClick={() => handleStartService(model.id)}
                        title="Load model (auto-downloads if needed)"
                      >
                        Load Model
                      </button>
                    ) : model.status === 'downloading' ? (
                      <button 
                        className="btn btn-info" 
                        disabled
                        title="Model is downloading..."
                      >
                        Downloading...
                      </button>
                    ) : model.status === 'running' ? (
                      <>
                        <button 
                          className="btn btn-primary" 
                          onClick={() => handleTestModel(model)}
                          title="Test inference with a simple prompt"
                        >
                          Test
                        </button>
                        <button 
                          className="btn btn-danger" 
                          onClick={() => handleStopService(model.id)}
                          title="Unload model"
                        >
                          Unload
                        </button>
                      </>
                    ) : null}
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleViewLogs(model)}
                      title="View logs"
                    >
                      Logs
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleDeleteModel(model.id)}
                      title="Delete model configuration"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Model Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">Add Model</div>
            <form onSubmit={handleAddModel}>
              <div className="form-group">
                <label className="form-label">Model Alias</label>
                <input
                  type="text"
                  className="form-control"
                  value={newModel.alias}
                  onChange={(e) => setNewModel({ ...newModel, alias: e.target.value })}
                  placeholder="e.g., phi-3-mini"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Model ID</label>
                <select
                  className="form-control"
                  value={newModel.model_id}
                  onChange={(e) => {
                    const selected = availableModels.find(m => m.id === e.target.value);
                    setNewModel({
                      alias: selected?.alias || e.target.value,
                      model_id: e.target.value
                    });
                  }}
                  required
                >
                  <option value="">Select a model...</option>

                  {/* Catalog Models */}
                  {catalogModels.length > 0 && (
                    <optgroup label="Catalog Models">
                      {catalogModels.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.description || m.id}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Custom Models */}
                  {customModels.length > 0 && (
                    <optgroup label="🔧 Custom Models">
                      {customModels.map(m => (
                        <option key={m.id} value={m.id}>
                          🔧 {m.description || m.id}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <small style={{ color: '#7f8c8d', marginTop: '0.25rem', display: 'block' }}>
                  Custom models from cache directory are marked with 🔧. Visit the Cache tab to manage.
                </small>
              </div>
              <div style={{ marginTop: '1.5rem' }}>
                <button type="submit" className="btn btn-primary">Add Model</button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {showLogsModal && (
        <div className="modal-overlay" onClick={() => setShowLogsModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              Logs: {selectedModel?.alias}
            </div>
            <div style={{ maxHeight: '400px', overflow: 'auto', background: '#f8f9fa', padding: '1rem', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {logs.length === 0 ? (
                <p>No logs available</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} style={{ marginBottom: '0.5rem', borderBottom: '1px solid #ecf0f1', paddingBottom: '0.5rem' }}>
                    <span style={{ color: log.level === 'error' ? '#e74c3c' : '#2c3e50' }}>
                      [{new Date(log.created_at * 1000).toLocaleString()}] {log.level.toUpperCase()}: {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowLogsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Models;
