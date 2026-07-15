const YoutubeAutomation = require('../models/YoutubeAutomation');
const YoutubeAccount = require('../models/YoutubeAccount');
const YoutubeAutomationService = require('../services/youtubeAutomationService');
const AppError = require('../utils/AppError');

exports.getSettings = async (req, res, next) => {
  try {
    let settings = await YoutubeAutomation.findOne({ organization: req.organization._id });
    if (!settings) {
      settings = await YoutubeAutomation.create({
        user: req.user._id,
        organization: req.organization._id
      });
    }

    // Also include connected channel info
    const account = await YoutubeAccount.findOne({
      organization: req.organization._id,
      isActive: true,
      status: 'connected'
    }).select('channelId channelName status');

    res.status(200).json({
      status: 'success',
      data: {
        ...settings.toObject(),
        channelId: account?.channelId || null,
        channelName: account?.channelName || null,
        isConnected: !!account,
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { enabled, automationMode, aiPrompt } = req.body;
    const settings = await YoutubeAutomation.findOneAndUpdate(
      { organization: req.organization._id },
      { enabled, automationMode, aiPrompt, user: req.user._id },
      { new: true, upsert: true }
    );
    res.status(200).json({ status: 'success', data: settings });
  } catch (err) {
    next(err);
  }
};

exports.getPendingComments = async (req, res, next) => {
  try {
    const settings = await YoutubeAutomation.findOne({ organization: req.organization._id });
    const pending = settings ? settings.pendingComments.filter(c => c.status === 'pending') : [];
    res.status(200).json({ status: 'success', data: pending });
  } catch (err) {
    next(err);
  }
};

exports.approveReply = async (req, res, next) => {
  try {
    const { commentId, customReply } = req.body;
    await YoutubeAutomationService.approveReply(req.user._id, req.organization._id, commentId, customReply);
    res.status(200).json({ status: 'success', message: 'Reply posted successfully' });
  } catch (err) {
    next(err);
  }
};

exports.ignoreComment = async (req, res, next) => {
  try {
    const { commentId } = req.body;
    const settings = await YoutubeAutomation.findOne({ organization: req.organization._id });
    if (settings) {
      const comment = settings.pendingComments.find(c => c.commentId === commentId);
      if (comment) {
        comment.status = 'ignored';
        await settings.save();
      }
    }
    res.status(200).json({ status: 'success', message: 'Comment ignored' });
  } catch (err) {
    next(err);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const settings = await YoutubeAutomation.findOne({ organization: req.organization._id });
    const history = settings ? settings.replyHistory.sort((a, b) => b.repliedAt - a.repliedAt) : [];
    res.status(200).json({ status: 'success', data: history });
  } catch (err) {
    next(err);
  }
};
