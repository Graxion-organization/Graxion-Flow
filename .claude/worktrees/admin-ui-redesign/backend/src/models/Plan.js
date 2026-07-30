const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Plan name is required'],
    unique: true,
    trim: true,
  },
  code: {
    type: String,
    required: [true, 'Plan code is required (e.g. starter, pro)'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  price: {
    type: Number,
    required: [true, 'Plan price in INR is required'],
    min: 0,
  },
  credits: {
    type: Number,
    required: [true, 'Plan credits count is required'],
    default: 100,
  },
  messageLimit: {
    type: Number,
    default: 1000,
  },
  agentLimit: {
    type: Number,
    default: 3,
  },
  postCreditCost: {
    type: Number,
    default: 1, // how many credits per platform post
  },
  agentMsgCreditCost: {
    type: Number,
    default: 1, // how many credits per AI Agent reply
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Plan', planSchema);
