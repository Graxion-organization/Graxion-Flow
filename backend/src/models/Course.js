const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  instructorName: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  syllabus: [{
    title: String,
    duration: Number // in hours
  }]
}, {
  timestamps: true
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
