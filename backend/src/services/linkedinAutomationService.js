const Agent = require('../models/Agent');
const LinkedInAccount = require('../models/LinkedInAccount');
const LinkedInService = require('./linkedinService');
const AIService = require('./aiService');
const logger = require('../utils/logger');

class LinkedinAutomationService {
  /**
   * Main job to process LinkedIn comments for all active Agents configured for LinkedIn
   */
  static async runAutomation() {
    try {
      logger.info('[LinkedIn Automation] Starting check cycle...');
      
      // Find all active Agents that have a LinkedIn account and include 'linkedin' in platforms
      const agents = await Agent.find({
        isActive: true,
        linkedinAccount: { $exists: true, $ne: null },
        platforms: 'linkedin'
      }).populate('linkedinAccount');

      if (!agents.length) {
        return; // No active LinkedIn agents
      }

      for (const agent of agents) {
        try {
          await this.processAgentAutomation(agent);
        } catch (err) {
          logger.error(`[LinkedIn Automation] Error processing agent ${agent.name}:`, err.message);
        }
      }
      
      logger.info('[LinkedIn Automation] Cycle completed.');
    } catch (err) {
      logger.error('[LinkedIn Automation] Fatal error in cycle:', err.message);
    }
  }

  /**
   * Process automation for a single Agent on LinkedIn
   */
  static async processAgentAutomation(agent) {
    const liAccount = agent.linkedinAccount;
    
    // Ensure account is still active
    if (!liAccount || !liAccount.isActive || !liAccount.accessToken) return;

    // Check token expiry if we track it (LinkedIn tokens usually expire in 60 days)
    if (liAccount.expiresAt && new Date(liAccount.expiresAt) <= new Date()) {
       logger.warn(`[LinkedIn Automation] Token expired for ${liAccount.name}. Please re-authenticate.`);
       return;
    }

    const provider = new LinkedInService(liAccount.accessToken, liAccount.linkedinId);

    // Fetch latest posts for the user/organization
    let posts = [];
    try {
      posts = await provider.getMemberPosts(5); // Check latest 5 posts for performance
    } catch (err) {
      if (err.response?.status === 401) {
        logger.warn(`[LinkedIn Automation] Unauthorized for ${liAccount.name}. Token might be expired.`);
        return;
      }
      throw err;
    }

    if (!posts || posts.length === 0) return;

    // Ensure array is initialized
    if (!agent.repliedLinkedinComments) {
      agent.repliedLinkedinComments = [];
    }

    let hasUpdates = false;

    for (const post of posts) {
      const postUrn = post.id;
      
      // Fetch comments for this post
      let comments = [];
      try {
        comments = await provider.getPostComments(postUrn);
      } catch (err) {
        logger.error(`[LinkedIn Automation] Error fetching comments for post ${postUrn}:`, err.message);
        continue;
      }

      for (const comment of comments) {
        const commentId = comment.id;
        
        // Skip if already replied
        if (agent.repliedLinkedinComments.includes(commentId)) continue;
        
        // Ensure author is not the account itself (don't reply to our own comments)
        const authorUrn = comment.actor;
        if (authorUrn.includes(liAccount.linkedinId)) continue;

        const commentText = comment.message?.text;
        if (!commentText) continue;

        logger.info(`[LinkedIn Automation] New comment on post ${postUrn}: ${commentText.substring(0, 30)}...`);

        try {
          // Generate AI Reply
          const systemPrompt = agent.systemPrompt || 'You are a helpful AI assistant.';
          const modelName = agent.model || 'gemini-1.5-flash';
          
          const contextMessages = [
            { role: 'system', content: `${systemPrompt}\n\nYou are replying to a LinkedIn comment. Keep it professional, concise, and engaging.` }
          ];

          // Use the aiService standard logic
          const replyText = await AIService.generate(
            agent,
            contextMessages,
            commentText,
            'linkedin'
          );

          if (replyText) {
            // Reply to comment
            await provider.replyToComment(commentId, replyText);
            
            // Add to tracked list
            agent.repliedLinkedinComments.push(commentId);
            hasUpdates = true;
            logger.info(`[LinkedIn Automation] Auto-replied to comment ${commentId}`);
          }
        } catch (err) {
          logger.error(`[LinkedIn Automation] Failed to reply to ${commentId}:`, err.message);
        }
      }
    }

    if (hasUpdates) {
      await agent.save();
    }
  }
}

module.exports = LinkedinAutomationService;
