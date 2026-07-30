const CreditTransaction = require('../models/CreditTransaction');
const logger = require('../utils/logger');


/**
 * Log a credit transaction (deduction, addition, or refund) in the database.
 * @param {Object} params
 * @param {string} params.userId - The ID of the user
 * @param {'deduction'|'addition'|'refund'} params.type - Transaction type
 * @param {number} params.amount - The absolute amount of credits (will be stored as positive number)
 * @param {string} params.description - The reason or detail for this transaction
 * @param {Object} [params.metadata] - Extra metadata about the transaction
 */
exports.logTransaction = async ({ userId, type, amount, description, metadata }) => {
  try {
    await CreditTransaction.create({
      user: userId,
      type,
      amount,
      description,
      metadata,
    });
  } catch (err) {
    logger.error('Failed to log credit transaction:', err);
  }
};

/**
 * Safely deduct credits from a user, ensuring they never drop below 0.
 * Also increments usage counters.
 * @param {string} userId - The user ID
 * @param {number} amount - The number of credits to deduct
 * @param {'agent'|'posting'} [spendType='agent'] - The type of credit deduction
 * @returns {Promise<number>} - The updated credits balance
 */
exports.deductCredits = async (userId, amount, spendType = 'agent') => {
  try {
    const User = require('../models/User');
    const user = await User.findById(userId).select('+usage +subscription');
    if (!user) return 0;

    const currentCredits = user.subscription?.credits ?? 0;
    const newCredits = Math.max(0, currentCredits - amount);

    const incFields = {
      'usage.messagesThisMonth': 1,
      'usage.totalMessages': 1
    };

    if (spendType === 'agent') {
      incFields['usage.agentCreditsUsedThisMonth'] = amount;
    } else if (spendType === 'posting') {
      incFields['usage.postingCreditsUsedThisMonth'] = amount;
    }

    await User.findByIdAndUpdate(userId, {
      $set: { 'subscription.credits': newCredits },
      $inc: incFields
    });

    return newCredits;
  } catch (err) {
    logger.error('Failed to safely deduct credits:', err);
    return 0;
  }
};
