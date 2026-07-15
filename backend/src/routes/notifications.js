const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/notifications — returns recent unread conversations as notifications
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;

    const unread = await Conversation.find({ user: userId, isRead: false })
      .select('_id customerName customerPhone customerIgId customerUsername platform lastMessageAt status messages')
      .sort({ lastMessageAt: -1 })
      .limit(20)
      .lean();

    const notifications = unread.map((conv) => {
      const lastMsg = conv.messages?.[conv.messages.length - 1];
      const senderLabel = conv.customerName || conv.customerPhone || conv.customerIgId || conv.customerUsername || 'Unknown';
      const preview = lastMsg?.content ? lastMsg.content.slice(0, 80) + (lastMsg.content.length > 80 ? '…' : '') : 'New message received';

      let title = '💬 New Message';
      if (conv.platform === 'instagram') title = '📸 New Instagram DM';
      else if (conv.platform === 'telegram') title = '✈️ New Telegram Message';
      else if (conv.platform === 'whatsapp') title = '💬 New WhatsApp Message';
      if (conv.status === 'human_handoff') title = '🔴 Human Handoff Requested';

      return {
        id: conv._id.toString(),
        type: conv.status === 'human_handoff' ? 'human_handoff' : 'new_message',
        title,
        message: `${senderLabel}: ${preview}`,
        conversationId: conv._id.toString(),
        platform: conv.platform,
        timestamp: conv.lastMessageAt,
        read: false,
      };
    });

    const totalUnread = await Conversation.countDocuments({ user: userId, isRead: false });

    res.status(200).json({
      status: 'success',
      data: { notifications, totalUnread },
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// PATCH /api/notifications/mark-read — mark specific conversation(s) as read
router.patch('/mark-read', async (req, res) => {
  try {
    const { conversationIds } = req.body; // array of ids, or empty to mark all
    const userId = req.user._id;

    const filter = { user: userId };
    if (conversationIds?.length) {
      filter._id = { $in: conversationIds };
    }

    await Conversation.updateMany(filter, { $set: { isRead: true } });

    res.status(200).json({ status: 'success' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

module.exports = router;
