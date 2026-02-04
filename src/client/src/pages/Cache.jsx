import React, { useState, useEffect } from 'react';
import { cacheAPI } from '../utils/api';

function Cache() {
  const [currentCache, setCurrentCache] = useState(null);
  const [defaultCache, setDefaultCache] = useState(null);
  const [isDefault, setIsDefault] = useState(true);
  const [customPath, setCustomPath] = useState('');
  const [cacheModels, setCacheModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Load current cache location and models
  useEffect(() => {
    loadCacheInfo();
  }, []);

  const loadCacheInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current cache location
      const locationData = await cacheAPI.getLocation();
      setCurrentCache(locationData.location);
      setDefaultCache(locationData.defaultPath);
      setIsDefault(locationData.isDefault);

      // Get models in cache
      const modelsData = await cacheAPI.listModels();
      setCacheModels(modelsData.models);

    } catch (err) {
      setError(`Failed to load cache info: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToCustom = async () => {
    if (!customPath.trim()) {
      setError('Please enter a cache directory path');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await cacheAPI.switchCache(customPath);
      setCurrentCache(result.location);
      setIsDefault(result.isDefault);
      setSuccess(`Successfully switched to custom cache: ${result.location}`);

      // Reload models
      const modelsData = await cacheAPI.listModels();
      setCacheModels(modelsData.models);

    } catch (err) {
      setError(`Failed to switch cache: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreDefault = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const result = await cacheAPI.switchCache('default');
      setCurrentCache(result.location);
      setIsDefault(result.isDefault);
      setSuccess('Successfully restored to default cache');

      // Reload models
      const modelsData = await cacheAPI.listModels();
      setCacheModels(modelsData.models);

    } catch (err) {
      setError(`Failed to restore default cache: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Cache Management</h2>
      <p>Manage Foundry Local cache directory to access custom models</p>

      {error && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '1rem',
          marginBottom: '1rem',
          backgroundColor: '#efe',
          border: '1px solid #cfc',
          borderRadius: '4px',
          color: '#3c3'
        }}>
          {success}
        </div>
      )}

      {/* Current Cache Display */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Current Cache Location</h3>
        <div style={{ marginTop: '1rem' }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Status:</strong>{' '}
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '4px',
              backgroundColor: isDefault ? '#e3f2fd' : '#fff3e0',
              color: isDefault ? '#1976d2' : '#f57c00',
              fontWeight: 'bold'
            }}>
              {isDefault ? 'Default Cache' : 'Custom Cache'}
            </span>
          </div>
          <div>
            <strong>Path:</strong>{' '}
            <code style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '0.9rem'
            }}>
              {currentCache || 'Loading...'}
            </code>
          </div>
          {defaultCache && !isDefault && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
              <strong>Default Path:</strong>{' '}
              <code style={{
                padding: '0.25rem 0.5rem',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                fontSize: '0.85rem'
              }}>
                {defaultCache}
              </code>
            </div>
          )}
        </div>
      </div>

      {/* Switch Cache Form */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3>Switch Cache Directory</h3>
        <div style={{ marginTop: '1rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="customPath" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Custom Cache Path
            </label>
            <input
              id="customPath"
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="/path/to/your/custom/cache"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '0.9rem',
                fontFamily: 'monospace'
              }}
              disabled={loading}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleSwitchToCustom}
              disabled={loading || !customPath.trim()}
              className="btn btn-primary"
            >
              {loading ? 'Switching...' : 'Switch to Custom'}
            </button>
            <button
              onClick={handleRestoreDefault}
              disabled={loading || isDefault}
              className="btn btn-secondary"
            >
              {loading ? 'Restoring...' : 'Restore Default'}
            </button>
            <button
              onClick={loadCacheInfo}
              disabled={loading}
              className="btn btn-success"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Models in Cache */}
      <div className="card">
        <h3>Models in Current Cache</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
          Found {cacheModels.length} model(s) in current cache
        </p>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading models...</div>
        ) : cacheModels.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
            No models found in current cache
          </div>
        ) : (
          <div style={{ marginTop: '1rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd', backgroundColor: '#f9f9f9' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Alias</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Model ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {cacheModels.map((model) => (
                  <tr key={`${model.alias}-${model.id}`} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <code style={{ fontSize: '0.9rem' }}>{model.alias}</code>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <code style={{ fontSize: '0.85rem', color: '#666' }}>{model.id}</code>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>
                      {model.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card" style={{ marginTop: '1.5rem', backgroundColor: '#f9f9f9' }}>
        <h3>How to Use Custom Models</h3>
        <ol style={{ marginTop: '1rem', lineHeight: '1.8', paddingLeft: '1.5rem' }}>
          <li>
            Compile your model to ONNX format and place it in a cache directory
          </li>
          <li>
            Enter the path to your cache directory above and click "Switch to Custom"
          </li>
          <li>
            Custom models will appear in the Models page dropdown with a 🔧 badge
          </li>
          <li>
            You can load and benchmark custom models just like catalog models
          </li>
          <li>
            Click "Restore Default" to switch back to the default Foundry cache
          </li>
        </ol>
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
          <strong>Note:</strong> Switching cache directories will change which models are available to Foundry Local.
          Make sure your custom models are properly compiled and compatible with Foundry Local.
        </div>
      </div>
    </div>
  );
}

export default Cache;
