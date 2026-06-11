const express = require('express');
const Batch = require('../models/Batch');
const router = express.Router();

// @desc    Get all batches
// @route   GET /api/batches
// @access  Public
router.get('/', async (req, res) => {
  try {
    const batches = await Batch.find({}).populate('courseId', 'title');
    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a batch
// @route   POST /api/batches
// @access  Private/Admin
router.post('/', async (req, res) => {
  try {
    const { courseId, name, schedule, aiInstructions } = req.body;
    const batch = new Batch({
      courseId,
      name,
      schedule,
      aiInstructions
    });
    const createdBatch = await batch.save();
    res.status(201).json(createdBatch);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
