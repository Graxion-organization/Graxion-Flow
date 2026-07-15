const Plan = require('../models/Plan');
const logger = require('./logger');

const seedPlans = async () => {
  try {
    const planCount = await Plan.countDocuments();
    if (planCount === 0) {
      logger.info('No plans found in database. Seeding default plans...');
      const defaultPlans = [
        {
          name: 'Free',
          code: 'free',
          price: 0,
          credits: 100,
          messageLimit: 100,
          agentLimit: 1,
          postCreditCost: 1,
          agentMsgCreditCost: 1,
          description: 'Explore basic automation for free',
          isActive: true
        },
        {
          name: 'Starter',
          code: 'starter',
          price: 10,
          credits: 1000,
          messageLimit: 1000,
          agentLimit: 3,
          postCreditCost: 1,
          agentMsgCreditCost: 1,
          description: 'Perfect for small businesses starting out',
          isActive: true
        },
        {
          name: 'Pro',
          code: 'pro',
          price: 1499,
          credits: 5000,
          messageLimit: 5000,
          agentLimit: 10,
          postCreditCost: 1,
          agentMsgCreditCost: 1,
          description: 'Ideal for growing businesses and agencies',
          isActive: true
        },
        {
          name: 'Enterprise',
          code: 'enterprise',
          price: 4999,
          credits: 50000,
          messageLimit: 50000,
          agentLimit: 50,
          postCreditCost: 1,
          agentMsgCreditCost: 1,
          description: 'Robust scaling solutions for large enterprises',
          isActive: true
        }
      ];
      await Plan.insertMany(defaultPlans);
      logger.info('Default plans successfully seeded.');
    }
  } catch (err) {
    logger.error('Error seeding plans:', err);
  }
};

module.exports = seedPlans;
