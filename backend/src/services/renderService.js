const axios = require('axios');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const NodeCache = require('node-cache');

// Cache Render API responses to avoid rate limiting
// 30 seconds default TTL for metrics, 5 minutes for static data like services
const renderCache = new NodeCache({ stdTTL: 30, checkperiod: 10 });

class RenderService {
  constructor() {
    this.apiKey = process.env.RENDER_API_KEY;
    this.client = axios.create({
      baseURL: 'https://api.render.com/v1',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    // Intercept to capture rate limits
    this.client.interceptors.response.use((response) => {
      this.lastRateLimit = {
        limit: response.headers['ratelimit-limit'] || 'Unavailable',
        remaining: response.headers['ratelimit-remaining'] || 'Unavailable',
        reset: response.headers['ratelimit-reset'] || 'Unavailable',
      };
      return response;
    }, (error) => {
      if (error.response?.headers) {
        this.lastRateLimit = {
          limit: error.response.headers['ratelimit-limit'] || 'Unavailable',
          remaining: error.response.headers['ratelimit-remaining'] || 'Unavailable',
          reset: error.response.headers['ratelimit-reset'] || 'Unavailable',
        };
      }
      return Promise.reject(error);
    });
  }

  getRateLimitInfo() {
    return this.lastRateLimit || { limit: 'Unavailable', remaining: 'Unavailable', reset: 'Unavailable' };
  }

  handleError(err, context) {
    if (err.response) {
      if (err.response.status === 401 || err.response.status === 403) {
        throw new AppError(`Render API Authentication Failed. Please check RENDER_API_KEY. Context: ${context}`, 401);
      }
      if (err.response.status === 429) {
        throw new AppError(`Render API Rate Limit Exceeded. Please try again later. Context: ${context}`, 429);
      }
      if (err.response.status === 404) {
        throw new AppError(`Render Resource Not Found. Context: ${context}`, 404);
      }
      throw new AppError(`Render API Error: ${err.response.data?.message || err.message}`, err.response.status || 500);
    }
    throw new AppError(`Render Service Error: ${err.message}`, 500);
  }

  async getServices() {
    if (!this.apiKey) throw new AppError('RENDER_API_KEY is not configured', 500);
    
    const cacheKey = 'render_services';
    const cached = renderCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get('/services?limit=100');
      const data = response.data;
      renderCache.set(cacheKey, data, 120); // 2 minutes cache for services list
      return data;
    } catch (err) {
      this.handleError(err, 'getServices');
    }
  }

  async getService(serviceId) {
    if (!this.apiKey) throw new AppError('RENDER_API_KEY is not configured', 500);

    const cacheKey = `render_service_${serviceId}`;
    const cached = renderCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get(`/services/${serviceId}`);
      renderCache.set(cacheKey, response.data, 60);
      return response.data;
    } catch (err) {
      this.handleError(err, `getService(${serviceId})`);
    }
  }

  async getDeployments(serviceId, limit = 20) {
    if (!this.apiKey) throw new AppError('RENDER_API_KEY is not configured', 500);

    const cacheKey = `render_deployments_${serviceId}_${limit}`;
    const cached = renderCache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.client.get(`/services/${serviceId}/deploys?limit=${limit}`);
      renderCache.set(cacheKey, response.data, 30); // 30 seconds cache for deployments
      return response.data;
    } catch (err) {
      this.handleError(err, `getDeployments(${serviceId})`);
    }
  }

  // Not all services have metrics exposed via simple API, but Render provides /metrics endpoint in early access or GraphQL. 
  // Wait, Render official REST API doesn't expose CPU/Memory metrics currently in /v1. 
  // Let's implement what's possible or return unavailable if they don't exist.
  // Actually, Render API doesn't have a public REST endpoint for CPU/Memory metrics. We will return N/A if unsupported.
  
  async getMetrics(serviceId) {
    // Render API v1 doesn't have a generic /metrics endpoint for resources out of the box for all plans.
    // It's mostly Prometheus integrations. We'll return unavailable for now to strictly avoid fake data.
    return {
      cpu: { current: 'Unavailable', average: 'Unavailable', peak: 'Unavailable' },
      memory: { current: 'Unavailable', average: 'Unavailable', peak: 'Unavailable' },
      bandwidth: { incoming: 'Unavailable', outgoing: 'Unavailable', total: 'Unavailable' },
      status: 'Not supported by Render API directly'
    };
  }

  async getHttpRequests(serviceId) {
    return {
      status: 'Not supported by Render API directly',
      cards: {
        total: 'Unavailable',
        '2xx': 'Unavailable',
        '3xx': 'Unavailable',
        '4xx': 'Unavailable',
        '5xx': 'Unavailable'
      },
      errorRate: 'Unavailable',
      endpoints: []
    };
  }
}

module.exports = new RenderService();
