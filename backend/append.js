const fs = require('fs');
let data = fs.readFileSync('c:/whatsapp-saas/backend/src/controllers/adminController.js', 'utf8');
data = data.replace('const ContactMessage = require(\'../models/ContactMessage\');\r\n', '');
data = data.replace('const ContactMessage = require(\'../models/ContactMessage\');\n', '');

const appendData = `
exports.getContactMessages = async (req, res, next) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: messages });
  } catch (err) {
    next(err);
  }
};

exports.markContactMessageRead = async (req, res, next) => {
  try {
    const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { status: 'read' }, { new: true });
    if (!msg) return res.status(404).json({ status: 'error', message: 'Message not found' });
    res.status(200).json({ status: 'success', data: msg });
  } catch (err) {
    next(err);
  }
};
`;

if (!data.includes('getContactMessages')) {
  data += appendData;
  fs.writeFileSync('c:/whatsapp-saas/backend/src/controllers/adminController.js', data);
  console.log('Appended successfully');
} else {
  console.log('Already exists');
}
