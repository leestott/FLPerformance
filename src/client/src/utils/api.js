import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Models API
export const modelsAPI = {
  getAvailable: () => api.get('/models/available'),
  getAll: () => api.get('/models'),
  add: (model) => api.post('/models', model),
  delete: (id) => api.delete(`/models/${id}`),
  start: (id) => api.post(`/models/${id}/start`),
  stop: (id) => api.post(`/models/${id}/stop`),
  load: (id) => api.post(`/models/${id}/load`),
  test: (id, data) => api.post(`/models/${id}/test`, data),
  health: (id) => api.get(`/models/${id}/health`),
  logs: (id, limit = 100) => api.get(`/models/${id}/logs`, { params: { limit } })
};

// Benchmarks API
export const benchmarksAPI = {
  getSuites: () => api.get('/benchmarks/suites'),
  run: (data) => api.post('/benchmarks/run', data),
  getRuns: () => api.get('/benchmarks/runs'),
  getRun: (id) => api.get(`/benchmarks/runs/${id}`),
  getResults: (params = {}) => api.get('/benchmarks/results', { params }),
  exportJSON: (id) => api.get(`/benchmarks/runs/${id}/export/json`, { responseType: 'blob' }),
  exportCSV: (id) => api.get(`/benchmarks/runs/${id}/export/csv`, { responseType: 'blob' }),
  logs: (id, limit = 100) => api.get(`/benchmarks/runs/${id}/logs`, { params: { limit } }),
  status: (id) => api.get(`/benchmarks/runs/${id}/status`)
};

// System API
export const systemAPI = {
  health: () => api.get('/system/health'),
  stats: () => api.get('/system/stats')
};

export default api;
