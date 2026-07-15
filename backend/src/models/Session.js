const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Batch',
    required: true,
  },
  zoomMeetingId: {
    type: String,
    required: true,
  },
  zoomJoinUrl: {
    type: String,
  },
  startTime: {
    type: Date,
  },
  endTime: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed'],
    default: 'scheduled'
  },
  currentMaterialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material'
  }
}, {
  timestamps: true
});

const Session = mongoose.model('Session', sessionSchema);
module.exports = Session;
