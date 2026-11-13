/**
 * Typed API Client module with configurable request timeouts and sanitized error mapping.
 */

const DEFAULT_TIMEOUT_MS = 15000;

class ApiError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function request(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const isJson = (response.headers.get('content-type') || '').includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const code = data?.error?.code || `HTTP_${response.status}`;
      const message = data?.error?.message || response.statusText || 'Request failed';
      throw new ApiError(code, message, response.status);
    }

    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError('REQUEST_TIMEOUT', 'Request exceeded time limit. Please check service connectivity.', 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError('NETWORK_ERROR', err.message || 'Network error occurred.', 0);
  }
}

export const apiClient = {
  getHealth: () => request('/api/health'),
  getCapabilities: () => request('/api/capabilities'),
  getModelCard: () => request('/api/model-card'),
  getMetrics: () => request('/api/metrics'),
  getGradCAM: async (file, targetId) => {
    if (!file) return request(`/api/explain/gradcam?target_id=${encodeURIComponent(targetId)}`);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('target_id', targetId);
    return request('/api/explain/gradcam', {
      method: 'POST',
      body: formData
    });
  },
  getGradCam: async (file, targetId) => {
    if (!file) return request(`/api/explain/gradcam?target_id=${encodeURIComponent(targetId)}`);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('target_id', targetId);
    return request('/api/explain/gradcam', {
      method: 'POST',
      body: formData
    });
  },

  checkQuality: async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return request('/api/quality', {
      method: 'POST',
      body: formData
    });
  },

  predictDirect: async (file, targetId) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('target_id', targetId);
    return request('/api/predict/direct', {
      method: 'POST',
      body: formData
    });
  },

  predictIndirect: async (file, targetId) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('target_id', targetId);
    return request('/api/predict/indirect', {
      method: 'POST',
      body: formData
    });
  },

  predictCompare: async (file, targetId) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('target_id', targetId);
    return request('/api/predict/compare', {
      method: 'POST',
      body: formData
    });
  },

  getResearcherSummary: async (token) => {
    return request('/api/researcher/system-summary', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  }
};

