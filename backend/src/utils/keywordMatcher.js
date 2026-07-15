const KeywordTrigger = require('../models/KeywordTrigger');

const checkKeywordMatch = async (organizationId, text) => {
  if (!text) return null;
  
  const triggers = await KeywordTrigger.find({ organization: organizationId });
  
  for (const trigger of triggers) {
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
