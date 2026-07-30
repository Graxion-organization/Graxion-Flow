const Contact = require('../models/Contact');
const AppError = require('../utils/AppError');

/**
 * Middleware to enforce TRAI / DND compliance for India.
 * Blocks outbound messages (e.g. Broadcasts, manual replies) if the contact has opted out (isOptedIn === false).
 */
exports.checkDndStatus = async (req, res, next) => {
  try {
    const { contactId, phone } = req.body;
    
    let contact = null;
    if (contactId) {
      contact = await Contact.findById(contactId);
    } else if (phone) {
      contact = await Contact.findOne({ 
        phone: phone.replace(/[^0-9]/g, ''),
        organization: req.organization?._id 
      });
    }

    // If contact exists but is opted out, block the message
    if (contact && contact.isOptedIn === false) {
      return next(new AppError('Message blocked: Contact has opted out (DND compliance)', 403));
    }

    // If contact doesn't exist, we might allow it (e.g., initial outreach) 
    // but in a strict TRAI environment, you might block unless explicit opt-in exists.
    // For now, we only block if explicitly opted out.
    
    next();
  } catch (err) {
    next(err);
  }
};
