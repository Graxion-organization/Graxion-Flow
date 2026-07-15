const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  contact: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', required: true },
  title: { type: String, required: true },
  amount: { type: Number, default: 0 },
  stage: { 
    type: String, 
    enum: ['LEAD', 'CONTACTED', 'NEGOTIATION', 'WON', 'LOST'], 
    default: 'LEAD' 
  },
  expectedCloseDate: { type: Date },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String
}, { timestamps: true });

// Auto add timeline event on stage change
dealSchema.pre('save', async function(next) {
  if (this.isModified('stage') && !this.isNew) {
    try {
      const Contact = mongoose.model('Contact');
      await Contact.findByIdAndUpdate(this.contact, {
        $push: {
          timeline: {
            type: 'NOTE',
            title: `Deal Stage Changed: ${this.title}`,
            description: `Moved to ${this.stage}`,
            timestamp: new Date()
          }
        }
      });
    } catch (err) {
      console.error('[Deal] Error updating contact timeline:', err);
    }
  }
  next();
});

module.exports = mongoose.model('Deal', dealSchema);
