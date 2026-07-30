const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  type: {
    type: String,
    enum: ['PDF', 'Note'],
    default: 'PDF'
  },
  url: {
    type: String,
    required: true,
  },
  cloudinaryId: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  processedData: {
    // We will store the structured JSON of chapters, pages, lesson plans, summaries, expected Q&A here
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

const Material = mongoose.model('Material', materialSchema);
module.exports = Material;
