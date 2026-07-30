/**
 * Detects common prompt injection patterns in user input.
 * Returns true if injection is detected.
 */
exports.detectPromptInjection = (message) => {
  if (!message || typeof message !== 'string') return false;
  
  const lowerMsg = message.toLowerCase();
  
  const injectionPatterns = [
    'ignore all previous instructions',
    'forget all previous instructions',
    'system prompt',
    'you are now',
    'pretend you are',
    'new instructions',
    'bypassing rules',
    'disregard previous',
    'print your instructions',
    'show me your instructions',
    'what are your instructions'
  ];

  return injectionPatterns.some((pattern) => lowerMsg.includes(pattern));
};

/**
 * Sanitizes user input to mitigate prompt injection.
 */
exports.sanitizePrompt = (message) => {
  if (!message || typeof message !== 'string') return message;
  
  // Basic sanitization: encode control characters, limit length, etc.
  // We can also just append a reminder to the LLM not to follow instructions from the user message.
  let sanitized = message.trim();
  
  // If we want to be safe, we can enforce a length limit to prevent massive payload injections
  if (sanitized.length > 2000) {
    sanitized = sanitized.substring(0, 2000);
  }
  
  return sanitized;
};
