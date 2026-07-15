const logger = require('../utils/logger');
const Organization = require('../models/Organization');

class ConversationPricingService {
  constructor() {
    // Current rough Meta pricing per category in USD (as of 2024, varies by country)
    // India (INR converted approx to USD for internal tracking)
    this.rates = {
      MARKETING: 0.0099,
      UTILITY: 0.0014,
      AUTHENTICATION: 0.0014,
      SERVICE: 0.0035 // User-initiated
    };
  }

  /**
   * Process webhook pricing payload
   * Ex: When a conversation is opened, Meta sends a pricing object
   */
  async processPricingWebhook(organizationId, pricingInfo, timestamp) {
    if (!pricingInfo) return;

    try {
      const category = pricingInfo.category.toUpperCase();
      const pricingModel = pricingInfo.pricing_model; // e.g., 'CBP' (Conversation-Based Pricing)
      
      const estimatedCost = this.rates[category] || 0.0050; // Fallback average

      // Log the conversation cost metric
      logger.info(`[Pricing] Org: ${organizationId} | Category: ${category} | Est. Cost: $${estimatedCost.toFixed(4)}`);

      // In a real application, you would store this in a "ConversationMetric" collection
      // or increment the organization's monthly billable usage.
      
      await Organization.findByIdAndUpdate(organizationId, {
        $inc: { 'usage.conversationsThisMonth': 1 }
      });

    } catch (err) {
      logger.error('[Pricing] Failed to process conversation pricing:', err);
    }
  }
}

module.exports = new ConversationPricingService();
