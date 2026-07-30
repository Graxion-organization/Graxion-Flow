const logger = require('../utils/logger');
const linkedinAutomationService = require('../services/linkedinAutomationService');

const crypto = require('crypto');

exports.verifyWebhook = (req, res) => {
  // LinkedIn sends a challenge query parameter that needs to be returned with HMAC signature
  const challengeCode = req.query.challengeCode;
  
  if (challengeCode) {
    const secret = process.env.LINKEDIN_CLIENT_SECRET || '';
    const challengeResponse = crypto.createHmac('sha256', secret).update(challengeCode).digest('hex');
    
    logger.info('LinkedIn webhook verification successful');
    res.status(200).json({ challengeCode, challengeResponse });
  } else {
    // Some versions use 'challenge'
    const challenge = req.query.challenge;
    if (challenge) {
      res.status(200).send(challenge);
    } else {
      res.status(400).send('Missing challengeCode');
    }
  }
};

exports.handleWebhook = async (req, res) => {
  try {
    const payload = req.body;
    logger.info(`Received LinkedIn webhook event`);

    // Acknowledge the webhook immediately to prevent timeouts
    res.status(200).send('EVENT_RECEIVED');
    
    // Process the event in the background if the service supports it
    // Note: Currently LinkedIn automation uses a polling cron job.
    // If you want to use webhooks instead, we would implement handleWebhookEvent in the service.
    if (linkedinAutomationService && linkedinAutomationService.handleWebhookEvent) {
      linkedinAutomationService.handleWebhookEvent(payload).catch(err => {
        logger.error(`Error in LinkedIn automation service: ${err.message}`);
      });
    } else {
      logger.info('LinkedIn Webhook payload received (No real-time handler implemented yet, relying on polling cron).');
    }
  } catch (error) {
    logger.error('Error handling LinkedIn webhook:', error);
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error');
    }
  }
};
