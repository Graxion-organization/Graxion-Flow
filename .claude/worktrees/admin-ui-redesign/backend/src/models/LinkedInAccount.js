const mongoose = require('mongoose');

const linkedinAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization'
  },
  linkedinId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: String,
  profilePicture: String,
  accessToken: {
    type: String,
    required: true
  },
  refreshToken: String,
  expiresAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure one account per LinkedIn ID per user/org
linkedinAccountSchema.index({ user: 1, linkedinId: 1 }, { unique: true });

module.exports = mongoose.model('LinkedInAccount', linkedinAccountSchema);
