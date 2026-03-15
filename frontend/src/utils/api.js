/**
 * VocalForge API Utility
 * Handles all API calls with authentication
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_TOKEN = import.meta.env.VITE_API_TOKEN || "dev-token-change-in-production";

/**
 * Make authenticated API call
 * @param {string} endpoint - API endpoint (e.g., "/health")
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - API response
 */
export async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${API_TOKEN}`,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * Make authenticated file upload
 * @param {string} endpoint - API endpoint
 * @param {FormData} formData - Form data with files
 * @returns {Promise<any>} - API response
 */
export async function uploadFile(endpoint, formData) {
  const url = `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_TOKEN}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get API base URL
 * @returns {string}
 */
export function getApiBase() {
  return API_BASE;
}

/**
 * Get API token (for debugging)
 * @returns {string}
 */
export function getApiToken() {
  return API_TOKEN;
}
