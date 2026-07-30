const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  schedule: {
    type: String, // e.g., 'Mon, Wed, Fri 10:00 AM'
  },
  studentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  aiInstructions: {
    language: { type: String, default: 'hi-IN' },
    tone: { type: String, default: 'friendly and encouraging' }
  }
}, {
  timestamps: true
});

const Batch = mongoose.model('Batch', batchSchema);
module.exports = Batch;
