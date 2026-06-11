const express = require('express');
const Course = require('../models/Course');
const router = express.Router();

// @desc    Get all courses
// @route   GET /api/courses
// @access  Public
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find({});
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Create a course
// @route   POST /api/courses
// @access  Private/Admin
router.post('/', async (req, res) => {
  try {
    const { title, description, instructorName, price, syllabus } = req.body;
    const course = new Course({
      title,
      description,
      instructorName,
      price,
      syllabus
    });
    const createdCourse = await course.save();
    res.status(201).json(createdCourse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
