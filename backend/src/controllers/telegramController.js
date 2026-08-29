const TelegramAccount = require('../models/TelegramAccount');
const AppError = require('../utils/AppError');
const TelegramService = require('../services/telegramService');

exports.connectAccount = async (req, res, next) => {
  try {
    const { botToken, defaultChatId } = req.body;
    if (!botToken) return next(new AppError('Bot Token is required', 400));

    // Verify token with Telegram API
    const tgService = new TelegramService(botToken);
    const botInfo = await tgService.getMe();
    
    if (!botInfo.ok) {
      return next(new AppError('Invalid Bot Token', 400));
    }

    const { username, first_name, id } = botInfo.result;

    let botPhotoUrl = '';
    try {
      const photos = await tgService.getUserProfilePhotos(id);
      if (photos.ok && photos.result.total_count > 0) {
        const fileId = photos.result.photos[0][0].file_id;
        const fileRes = await tgService.getFile(fileId);
        if (fileRes.ok) {
          botPhotoUrl = `https://api.telegram.org/file/bot${botToken}/${fileRes.result.file_path}`;
        }
      }
    } catch (err) {
      logger.error('Could not fetch bot photo', err.message);
    }

    // Set Webhook
    // Note: Use an environment variable for the base URL in production
    const baseUrl = process.env.BASE_URL || `https://${req.get('host')}`;
    const webhookUrl = `${baseUrl}/api/telegram/webhook/${username}`;
    
    await tgService.setWebhook(webhookUrl);

    let account = await TelegramAccount.findOne({ botUsername: username });
    if (account) {
      if (account.organization.toString() !== req.organization._id.toString()) {
        return next(new AppError('This bot is already registered to another organization', 403));
      }
      account.botToken = botToken;
      account.botName = first_name;
      if (botPhotoUrl) account.botPhotoUrl = botPhotoUrl;
      account.defaultChatId = defaultChatId || account.defaultChatId || '';
      account.status = 'connected';
      await account.save();
    } else {
      account = await TelegramAccount.create({
        user: req.user._id,
        organization: req.organization._id,
        botToken,
        botUsername: username,
        botName: first_name,
        botPhotoUrl,
        defaultChatId: defaultChatId || '',
        status: 'connected',
      });
    }

    res.status(200).json({ status: 'success', data: { account } });
  } catch (err) {
    next(err);
  }
};

exports.getAccounts = async (req, res, next) => {
  try {
    const accounts = await TelegramAccount.find({ organization: req.organization._id });
    res.status(200).json({ status: 'success', data: { accounts } });
  } catch (err) {
    next(err);
  }
};

exports.disconnectAccount = async (req, res, next) => {
  try {
    const account = await TelegramAccount.findOne({ _id: req.params.id, organization: req.organization._id });
    if (!account) return next(new AppError('Account not found', 404));

    // Remove webhook
    try {
      const tgService = new TelegramService(account.botToken);
      await tgService.setWebhook('');
    } catch (e) {
      // Ignore if it fails
    }

    await TelegramAccount.findByIdAndDelete(req.params.id);
    res.status(200).json({ status: 'success', message: 'Account disconnected' });
  } catch (err) {
    next(err);
  }
};
