const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  paymentId: String,
  invoiceNumber: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  gst: { type: Number, default: 0 },
  total: { type: Number, required: true },
  pdfUrl: String,
}, { timestamps: true });

module.exports = mongoose.model('Invoice', invoiceSchema);