const mongoose = require('mongoose');

const partnerCommissionSchema = new mongoose.Schema({
  partner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  paymentAmount: {
    type: Number,
    required: true,
  },
  commissionAmount: {
    type: Number,
    required: true,
  },
  commissionRate: {
    type: Number,
    required: true, // e.g. 20 for 20%
  },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'],
    default: 'APPROVED',
  },
  payoutTxnId: {
    type: String,
    default: null,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('PartnerCommission', partnerCommissionSchema);
