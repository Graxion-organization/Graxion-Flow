const logger = require('../utils/logger');
const Organization = require('../models/Organization');
const { emailService } = require('./emailService');

class SLAService {
  constructor() {
    // Map of orgId to their SLA threshold in ms
    this.slaThresholds = new Map();
  }

  async loadThresholds() {
    try {
      // Find all enterprise orgs or orgs with custom SLA
      const orgs = await Organization.find({ 'plan.type': 'enterprise' }).lean();
      for (const org of orgs) {
        // Default to 1500ms for enterprise if not explicitly set
        const threshold = org.slaThresholdMs || 1500;
        this.slaThresholds.set(org._id.toString(), threshold);
      }
      logger.info(`[SLA] Loaded SLA thresholds for ${this.slaThresholds.size} organizations`);
    } catch (err) {
      logger.error('[SLA] Error loading thresholds:', err);
    }
  }

  /**
   * Monitor API response times middleware
   */
  apiMonitor() {
    return (req, res, next) => {
      const start = process.hrtime();
      
      const originalSend = res.send;
      res.send = (...args) => {
        res.send = originalSend;
        
        const diff = process.hrtime(start);
        const timeMs = (diff[0] * 1e3) + (diff[1] * 1e-6);

        // Record metrics (in a real app, this would go to Prometheus/DataDog)
        
        // Check for SLA breach
        if (req.user && req.user.organization) {
          const orgId = req.user.organization.toString();
          const threshold = this.slaThresholds.get(orgId);
          
          if (threshold && timeMs > threshold) {
            this.handleBreach(orgId, req.path, timeMs, threshold);
          }
        }

        return res.send(...args);
      };
      next();
    };
  }

  /**
   * Handle an SLA breach event
   */
  async handleBreach(orgId, endpoint, actualMs, thresholdMs) {
    logger.warn(`[SLA BREACH] Org: ${orgId} | Endpoint: ${endpoint} | Time: ${actualMs.toFixed(2)}ms | Threshold: ${thresholdMs}ms`);
    
    // In production, we would alert oncall or send email to customer success team
    // Only emit alert if it breaches significantly or frequently (debounced)
    if (actualMs > thresholdMs * 2) {
        // Severe breach (e.g., >3 seconds on a 1.5s SLA)
        logger.error(`[SLA SEVERE BREACH] Sending alert to engineering team for Org: ${orgId}`);
    }
  }
}

module.exports = new SLAService();
