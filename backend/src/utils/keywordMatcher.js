const KeywordTrigger = require('../models/KeywordTrigger');

const checkKeywordMatch = async (organizationId, text, platform = 'whatsapp', replyType = 'DM', agentId = null) => {
  if (!text) return null;
  
  const query = { 
    organization: organizationId,
    platforms: { $in: [platform] },
    replyType: { $in: [replyType, 'ALL'] }
  };

  const triggers = await KeywordTrigger.find(query);

  // Filter triggers: if a trigger has an agent set, it must match the incoming agentId.
  // If a trigger does NOT have an agent set, it's universal and matches for any agent.
  const applicableTriggers = triggers.filter(t => !t.agent || (agentId && t.agent.toString() === agentId.toString()));
  
  for (const trigger of applicableTriggers) {
    if (trigger.matchType === 'EXACT') {
      if (text.trim().toLowerCase() === trigger.keyword.toLowerCase()) return trigger;
    } else if (trigger.matchType === 'CONTAINS') {
      if (text.toLowerCase().includes(trigger.keyword.toLowerCase())) return trigger;
    } else if (trigger.matchType === 'REGEX') {
      try {
        const regex = new RegExp(trigger.keyword, 'i');
        if (regex.test(text)) return trigger;
      } catch (e) {
        // Invalid regex, skip
      }
    }
  }
  return null;
};

module.exports = { checkKeywordMatch };
