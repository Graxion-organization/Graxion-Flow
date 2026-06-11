const express = require('express');
const multer = require('multer');
const Agent = require('../models/Agent');
const router = express.Router();

// Fallback to local uploads if cloudinary isn't fully set up yet
const fs = require('fs');
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Mock Auth Middleware for now (Assuming we attach req.user)
const protect = (req, res, next) => {
  // In a real app, verify JWT here
  req.user = { _id: "60d0fe4f5311236168a109ca" }; // Dummy user ID
  next();
};

// @desc    Get all agents for logged-in user
// @route   GET /api/agents
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const agents = await Agent.find({ owner: req.user._id });
    res.json(agents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create an agent
// @route   POST /api/agents
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, personaPrompt, elevenLabsVoiceId, knowledgeBase } = req.body;
    const agent = new Agent({
      owner: req.user._id,
      name,
      personaPrompt,
      elevenLabsVoiceId,
      knowledgeBase: knowledgeBase || []
    });
    const createdAgent = await agent.save();
    res.status(201).json(createdAgent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Upload file to agent's knowledge base
// @route   POST /api/agents/:id/knowledge-base
// @access  Private
router.post('/:id/knowledge-base', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const agent = await Agent.findOne({ _id: req.params.id, owner: req.user._id });
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Determine file type simply
    let fileType = 'text';
    if (req.file.mimetype.includes('pdf')) fileType = 'pdf';
    else if (req.file.mimetype.includes('video')) fileType = 'video';
    else if (req.file.mimetype.includes('image')) fileType = 'image';

    const newKbEntry = {
      fileUrl: req.file.path,
      fileType: fileType
    };

    agent.knowledgeBase.push(newKbEntry);
    await agent.save();

    res.status(200).json({
      message: 'File added to knowledge base',
      knowledgeBase: agent.knowledgeBase
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get single agent
// @route   GET /api/agents/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, owner: req.user._id });
    if (agent) {
      res.json(agent);
    } else {
      res.status(404).json({ message: 'Agent not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Delete single agent
// @route   DELETE /api/agents/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const agent = await Agent.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (agent) {
      res.json({ message: 'Agent removed' });
    } else {
      res.status(404).json({ message: 'Agent not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
