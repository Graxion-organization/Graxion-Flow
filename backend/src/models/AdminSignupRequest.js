const mongoose = require('mongoose');

const adminSignupRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600, // TTL index: Automatically deletes request after 1 hour (3600 seconds)
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('AdminSignupRequest', adminSignupRequestSchema);
