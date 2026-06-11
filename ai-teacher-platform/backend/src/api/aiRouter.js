const express = require('express');
const { generatePresentationScript } = require('../services/aiService');
const router = express.Router();

// @desc    Generate a presentation script based on Knowledge Base
// @route   POST /api/ai/generate-script
// @access  Private
router.post('/generate-script', async (req, res) => {
  try {
    const { personaPrompt, knowledgeBaseText } = req.body;
    
    if (!personaPrompt || !knowledgeBaseText) {
      return res.status(400).json({ message: 'personaPrompt and knowledgeBaseText are required' });
    }

    const script = await generatePresentationScript(personaPrompt, knowledgeBaseText);
    
    res.json({ script });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
