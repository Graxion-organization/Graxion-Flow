const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  zoomMeetingId: {
    type: String,
    required: true
  },
  zoomPassword: {
    type: String
  },
  zoomJoinUrl: {
    type: String
  },
  zoomStartUrl: {
    type: String
  },
  topic: {
    type: String,
    required: true
  },
  scheduledStartTime: {
    type: Date,
    required: true
  },
  durationMinutes: {
    type: Number,
    default: 30
  },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'failed'],
    default: 'scheduled'
  },
  presentationDetails: {
    currentScriptPhase: String,
    logs: [String]
  }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
