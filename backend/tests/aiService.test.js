const AIService = require('../src/services/aiService');

describe('AIService Logic', () => {
  test('isWithinBusinessHours should return true if no hours configured', () => {
    expect(AIService.isWithinBusinessHours(null)).toBe(true);
    expect(AIService.isWithinBusinessHours({ enabled: false })).toBe(true);
  });

  test('shouldHandoffToHuman should return true for matched keywords', () => {
    const keywords = ['support', 'human', 'agent'];
    expect(AIService.shouldHandoffToHuman('I need a human please', keywords)).toBe(true);
    expect(AIService.shouldHandoffToHuman('talk to agent', keywords)).toBe(true);
  });

  test('shouldHandoffToHuman should return false for unmatched keywords', () => {
    const keywords = ['support', 'human', 'agent'];
    expect(AIService.shouldHandoffToHuman('What is the price?', keywords)).toBe(false);
  });

  test('sanitizeForWhatsApp should convert markdown correctly', () => {
    const raw = '**Bold** and ### heading and __italic__';
    const clean = AIService.sanitizeForWhatsApp(raw);
    expect(clean).toBe('*Bold* and  heading and _italic_');
  });
});
