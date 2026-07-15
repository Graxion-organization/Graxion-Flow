const fs = require('fs');
const path = require('path');

const filePath = path.join('c:/whatsapp-saas/backend/src/controllers/conversationController.js');
let content = fs.readFileSync(filePath, 'utf8');

const getMessagesCode = `
exports.getMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const Message = require('../models/Message');
    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    // Return in chronological order for frontend
    res.status(200).json({ success: true, data: messages.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
`;

content = content + '\n' + getMessagesCode;
fs.writeFileSync(filePath, content);
console.log('Added getMessages to conversationController');
