const PostAutomation = require('../models/PostAutomation');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

exports.saveAutomation = async (req, res, next) => {
  try {
    const { platform, accountId, mediaId, triggerType, keywords, dmMessage, commentReply, isActive } = req.body;

    if (!platform || !accountId || !mediaId || !triggerType || !dmMessage || !commentReply) {
      return next(new AppError('Missing required fields', 400));
    }

    let automation = await PostAutomation.findOne({
      organization: req.organization._id,
      platform,
      accountId,
      mediaId
    });

    if (automation) {
      automation.triggerType = triggerType;
      automation.keywords = keywords || [];
      automation.dmMessage = dmMessage;
      automation.commentReply = commentReply;
      automation.isActive = isActive !== undefined ? isActive : automation.isActive;
      await automation.save();
    } else {
      automation = await PostAutomation.create({
        organization: req.organization._id,
        platform,
        accountId,
        mediaId,
        triggerType,
        keywords: keywords || [],
        dmMessage,
        commentReply,
        isActive: isActive !== undefined ? isActive : true
      });
    }

    res.status(200).json({
      status: 'success',
      data: automation
    });
  } catch (err) {
    logger.error('Error in saveAutomation:', err);
    next(err);
  }
};

exports.getAutomation = async (req, res, next) => {
  try {
    const { platform, accountId, mediaId } = req.params;

    const automation = await PostAutomation.findOne({
      organization: req.organization._id,
      platform,
      accountId,
      mediaId
    });

    res.status(200).json({
      status: 'success',
      data: automation || null
    });
  } catch (err) {
    logger.error('Error in getAutomation:', err);
    next(err);
  }
};
