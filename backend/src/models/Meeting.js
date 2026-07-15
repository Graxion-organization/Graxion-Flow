const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
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
  audioUrl: {
    type: String,
    default: null // e.g. /audio/meeting-<id>-<timestamp>.mp3
  },
  videoUrl: {
    type: String,
    default: null // Cloudinary URL of uploaded presentation video
  },
  presentationType: {
    type: String,
    enum: ['ai_voice', 'video'],
    default: 'ai_voice' // 'ai_voice' = TTS script, 'video' = uploaded video file
  },
  presentationDetails: {
    currentScriptPhase: String,
    logs: [String]
  }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);
