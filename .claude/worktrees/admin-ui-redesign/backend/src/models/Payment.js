const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  razorpaySignature: String,
  razorpaySubscriptionId: String,

  plan: {
    type: String,
    enum: ['starter', 'pro', 'enterprise'],
    required: true,
  },
  amount: {
    type: Number,
    required: true, // in paise
  },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['created', 'authorized', 'captured', 'failed', 'refunded'],
    default: 'created',
  },
  type: {
    type: String,
    enum: ['subscription', 'one_time'],
    default: 'subscription',
  },
  billingPeriod: {
    start: Date,
    end: Date,
  },
  invoiceUrl: String,
  metadata: mongoose.Schema.Types.Mixed,
}, {
  timestamps: true,
});

paymentSchema.index({ user: 1, status: 1 });
paymentSchema.index({ razorpayOrderId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
