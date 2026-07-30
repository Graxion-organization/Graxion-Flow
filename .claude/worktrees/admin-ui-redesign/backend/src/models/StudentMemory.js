const mongoose = require('mongoose');

const studentMemorySchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  attendanceCount: {
    type: Number,
    default: 0
  },
  totalSessionTimeMinutes: {
    type: Number,
    default: 0
  },
  questionsAskedCount: {
    type: Number,
    default: 0
  },
  weakTopics: [{
    topic: String,
    detectedCount: Number
  }],
  strongTopics: [{
    topic: String,
    detectedCount: Number
  }],
  engagementScore: {
    type: Number,
    default: 100 // Out of 100
  }
}, {
  timestamps: true
});

const StudentMemory = mongoose.model('StudentMemory', studentMemorySchema);
module.exports = StudentMemory;
