const mongoose = require('mongoose');

const classSummarySchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    unique: true
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  transcript: {
    type: String, // Full JSON string or raw text of the class conversation
  },
  summary: {
    type: String,
  },
  keyTakeaways: [{
    type: String
  }],
  generatedMcqs: [{
    question: String,
    options: [String],
    correctAnswer: String
  }],
  attendanceRecords: [{
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    joinTime: Date,
    leaveTime: Date,
    durationMinutes: Number,
    questionsAsked: Number
  }]
}, {
  timestamps: true
});

const ClassSummary = mongoose.model('ClassSummary', classSummarySchema);
module.exports = ClassSummary;
