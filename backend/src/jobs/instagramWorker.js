const cron = require('node-cron');
const InstagramAccount = require('../models/InstagramAccount');
const InstagramService = require('../services/instagramService');
const AIService = require('../services/aiService');
const logger = require('../utils/logger');
const User = require('../models/User');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function processUnansweredDMs() {
  logger.info('[Instagram Worker] Starting to process unanswered DMs...');

  try {
    // 1. Fetch all active Instagram accounts where comment bot is enabled
    const accounts = await InstagramAccount.find({ isActive: true, commentBotEnabled: true }).select('+pageAccessToken');
    
    if (accounts.length === 0) {
      logger.info('[Instagram Worker] No active accounts with Bot enabled. Exiting worker.');
      return;
    }

    // 2. Loop through accounts
    for (const account of accounts) {
      try {
        logger.info(`[Instagram Worker] Checking account ${account.igAccountId} (${account.igUsername || 'unknown'})`);
        
        // Ensure user exists and has a valid subscription/credits
        const user = await User.findById(account.user);
        if (!user || user.subscription.credits <= 0) {
          logger.warn(`[Instagram Worker] User ${account.user} has no credits or does not exist. Skipping.`);
          continue;
        }

        const igService = new InstagramService(account.pageAccessToken, account.pageId, account.igAccountId);
        
        // Fetch conversations
        const conversations = await igService.getConversations();
        
        if (!conversations || conversations.length === 0) {
          continue;
        }

        // Process up to 50 conversations per account to avoid excessive API hits in one run
        const activeConvos = conversations.slice(0, 50);

        for (const convo of activeConvos) {
          try {
            await delay(1000); // 1-second delay between thread fetches (Rate limit protection)
            
            const messages = await igService.getConversationMessages(convo.id);
            if (!messages || messages.length === 0) continue;

            // Messages are typically returned newest first or oldest first. 
            // We need to sort by created_time descending to find the absolute latest.
            messages.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
            const latestMessage = messages[0];

            // If the latest message was sent by the PAGE/BOT itself, then it's already answered
            // "from.id" will be the igAccountId if the page sent it. If it's a customer, it will be the customer's ID.
            if (latestMessage.from && latestMessage.from.id !== account.igAccountId) {
              
              // Check if the message is too old (e.g. older than 3 days). Don't reply to ancient missed messages.
              const messageAgeDays = (Date.now() - new Date(latestMessage.created_time)) / (1000 * 60 * 60 * 24);
              if (messageAgeDays > 3) {
                continue;
              }

              logger.info(`[Instagram Worker] Found unanswered DM from ${latestMessage.from.id}: "${latestMessage.message}"`);
              
              // Generate AI Reply
              let botReply = "Thank you for reaching out!";
              try {
                // Prepare mock agent for AI Service
                const agentMock = {
                  systemPrompt: account.commentBotPrompt || "You are a helpful assistant.",
                  aiProvider: 'openai',
                  model: 'gpt-4o-mini',
                  temperature: 0.7,
                  maxTokens: 500
                };
                
                // Add conversation context
                const chatHistory = messages.reverse().slice(-10).map(m => ({
                  role: m.from.id === account.igAccountId ? 'assistant' : 'user',
                  content: m.message || ''
                })).filter(m => m.content);

                // Add the user message (last message)
                chatHistory.push({ role: 'user', content: latestMessage.message });
                const userMessageText = chatHistory.pop().content;
                
                const aiResponse = await AIService.generate(agentMock, chatHistory, userMessageText, 'instagram');
                if (aiResponse && aiResponse.content) {
                  botReply = aiResponse.content;
                }
              } catch (aiErr) {
                logger.error(`[Instagram Worker] AI Service failed, using fallback: ${aiErr.message}`);
              }

              // Send Reply
              await delay(1500); // Wait before sending
              await igService.sendTextMessage(account.igAccountId, latestMessage.from.id, botReply);
              logger.info(`[Instagram Worker] Replied to ${latestMessage.from.id}`);

              // Deduct 1 credit
              await User.findByIdAndUpdate(account.user, {
                $inc: { 'subscription.credits': -1, 'usage.totalMessages': 1 }
              });
            }

          } catch (convoErr) {
            logger.warn(`[Instagram Worker] Failed to process conversation ${convo.id}: ${convoErr.message}`);
          }
        }

      } catch (accountErr) {
        logger.error(`[Instagram Worker] Failed to process account ${account.igAccountId}: ${accountErr.message}`);
      }
    }

    logger.info('[Instagram Worker] Finished processing DMs.');
  } catch (err) {
    logger.error(`[Instagram Worker] Fatal error: ${err.message}`);
  }
}

// Function to start the 3-Hour Cron
function startInstagramWorker() {
  // "0 */3 * * *" -> Minute 0, every 3 hours
  logger.info('[Instagram Worker] Initializing 3-hour cron job...');
  cron.schedule('0 */3 * * *', () => {
    logger.info('[Instagram Worker] Cron triggered.');
    processUnansweredDMs();
  });
}

module.exports = {
  startInstagramWorker,
  processUnansweredDMs
};
