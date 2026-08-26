const renderService = require('../services/renderService');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

exports.getOverview = async (req, res, next) => {
  try {
    const services = await renderService.getServices();
    const rateLimit = renderService.getRateLimitInfo();

    let healthyCount = 0;
    let totalCount = 0;
    
    // Parse service statuses
    if (Array.isArray(services)) {
        totalCount = services.length;
        healthyCount = services.filter(s => s.service?.suspended === 'suspended' ? false : true).length; // Render API returns suspended status, else it's usually active
    }

    const overallStatus = healthyCount === totalCount && totalCount > 0 ? 'Operational' : 'Degraded';

    res.status(200).json({
      status: 'success',
      data: {
        overview: {
          overallStatus,
          servicesHealthy: healthyCount,
          servicesTotal: totalCount,
          apiHealthy: true,
          lastUpdated: new Date().toISOString()
        },
        rateLimit
      }
    });
  } catch (err) {
    if (err.statusCode === 401) {
      return res.status(200).json({
        status: 'success',
        data: {
          overview: {
            overallStatus: 'Render API UNAVAILABLE',
            reason: 'Authentication failed. Check API Key.',
            apiHealthy: false
          }
        }
      });
    }
    next(err);
  }
};

exports.getServices = async (req, res, next) => {
  try {
    const services = await renderService.getServices();
    res.status(200).json({
      status: 'success',
      data: { services }
    });
  } catch (err) {
    next(err);
  }
};

exports.getServiceDetails = async (req, res, next) => {
  try {
    const service = await renderService.getService(req.params.serviceId);
    res.status(200).json({
      status: 'success',
      data: { service }
    });
  } catch (err) {
    next(err);
  }
};

exports.getServiceMetrics = async (req, res, next) => {
  try {
    const metrics = await renderService.getMetrics(req.params.serviceId);
    res.status(200).json({
      status: 'success',
      data: { metrics }
    });
  } catch (err) {
    next(err);
  }
};

exports.getServiceHttpRequests = async (req, res, next) => {
  try {
    const requests = await renderService.getHttpRequests(req.params.serviceId);
    res.status(200).json({
      status: 'success',
      data: { requests }
    });
  } catch (err) {
    next(err);
  }
};

exports.getServiceDeployments = async (req, res, next) => {
  try {
    const deployments = await renderService.getDeployments(req.params.serviceId);
    res.status(200).json({
      status: 'success',
      data: { deployments }
    });
  } catch (err) {
    next(err);
  }
};

exports.getRateLimit = async (req, res, next) => {
  try {
    const rateLimit = renderService.getRateLimitInfo();
    res.status(200).json({
      status: 'success',
      data: { rateLimit }
    });
  } catch (err) {
    next(err);
  }
};
