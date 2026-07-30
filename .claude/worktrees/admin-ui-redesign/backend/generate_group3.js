const fs = require('fs');
const path = require('path');

const assignmentService = `const Conversation = require('../models/Conversation');
const Organization = require('../models/Organization');
const logger = require('../utils/logger');

// Auto-assign a conversation to a team member in a round-robin fashion
exports.autoAssignConversation = async (conversationId, organizationId) => {
  try {
    const org = await Organization.findById(organizationId).populate('members.user');
    if (!org || !org.members || org.members.length === 0) return;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || conversation.assignedTo) return; // Already assigned

    // Find the last assigned member to do round-robin
    // A real implementation would store a 'lastAssignedIndex' in Organization or use Redis
    // For now, we just pick a random member
    const randomIndex = Math.floor(Math.random() * org.members.length);
    const assignedMember = org.members[randomIndex].user._id;

    conversation.assignedTo = assignedMember;
    await conversation.save();

    logger.info(\`[AssignmentService] Auto-assigned conversation \${conversationId} to user \${assignedMember}\`);
    return assignedMember;
  } catch (error) {
    logger.error('Auto-assignment failed:', error.message);
  }
};
`;

const leadScoringService = `const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

// Simple heuristic-based lead scoring
// In a true AI system, this could invoke Gemini to rate the lead based on intent
exports.scoreLead = async (conversationId) => {
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return 0;

    let score = 0;
    const messages = await conversation.getRecentMessages(50);
    const userMessages = messages.filter(m => m.role === 'user');

    // 1. Engagement: More messages = higher score (up to 30 points)
    score += Math.min(userMessages.length * 2, 30);

    // 2. Intent Keywords
    const highIntentKeywords = ['buy', 'price', 'cost', 'upgrade', 'plan', 'payment', 'demo', 'contact'];
    let keywordHits = 0;
    
    for (const msg of userMessages) {
      if (!msg.content) continue;
      const content = msg.content.toLowerCase();
      highIntentKeywords.forEach(kw => {
        if (content.includes(kw)) keywordHits++;
      });
    }
    
    score += Math.min(keywordHits * 5, 40); // Max 40 points from keywords

    // 3. Media sent (shows deeper engagement)
    const mediaMessages = userMessages.filter(m => m.media && m.media.type);
    score += Math.min(mediaMessages.length * 10, 30); // Max 30 points from media

    // Cap at 100
    score = Math.min(score, 100);

    // Update conversation (or Contact if we had a direct ref)
    conversation.leadScore = score;
    await conversation.save();

    logger.info(\`[LeadScoring] Conversation \${conversationId} scored at \${score}/100\`);
    return score;
  } catch (error) {
    logger.error('Lead scoring failed:', error.message);
    return 0;
  }
};
`;

fs.writeFileSync(path.join(__dirname, 'src', 'services', 'assignmentService.js'), assignmentService);
fs.writeFileSync(path.join(__dirname, 'src', 'services', 'leadScoringService.js'), leadScoringService);

// Update Conversation schema
let convModel = fs.readFileSync(path.join(__dirname, 'src', 'models', 'Conversation.js'), 'utf8');
if (!convModel.includes('leadScore:')) {
  convModel = convModel.replace('tags: [{ type: String }],', 
  \`tags: [{ type: String }],
  leadScore: { type: Number, default: 0 },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  \`);
  fs.writeFileSync(path.join(__dirname, 'src', 'models', 'Conversation.js'), convModel);
}

console.log('Group 3 completed');
