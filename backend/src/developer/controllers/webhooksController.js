const crypto = require('crypto');
const mongoose = require('mongoose');
const WebhookSubscription = require('../../models/WebhookSubscription');
const WebhookDelivery = require('../../models/WebhookDelivery');
const outboundWebhookService = require('../../services/outboundWebhookService');
const { sendDeveloperSuccess, sendDeveloperError } = require('../middleware/requestContext');

exports.listSubscriptions = async (req, res) => {
  try {
    const subscriptions = await WebhookSubscription.find({
      organization: req.organization._id
    })
      .sort('-createdAt')
      .lean();

    return sendDeveloperSuccess(req, res, 200, { subscriptions }, { total: subscriptions.length });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'WEBHOOKS_LIST_ERROR', 'Failed to list webhook subscriptions.');
  }
};

exports.getSubscription = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid subscription ID format.');
    }

    const subscription = await WebhookSubscription.findOne({
      _id: req.params.id,
      organization: req.organization._id
    }).lean();

    if (!subscription) {
      return sendDeveloperError(req, res, 404, 'SUBSCRIPTION_NOT_FOUND', 'Webhook subscription not found in workspace.');
    }

    return sendDeveloperSuccess(req, res, 200, { subscription });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'WEBHOOK_GET_ERROR', 'Failed to retrieve webhook subscription.');
  }
};

exports.createSubscription = async (req, res) => {
  try {
    const { name, targetUrl, events, signingSecret, headers, maxRetries, timeoutMs, isActive } = req.body;

    const urlValidation = outboundWebhookService.validateWebhookTargetUrl(targetUrl);
    if (!urlValidation.valid) {
      return sendDeveloperError(req, res, 400, 'INVALID_TARGET_URL', urlValidation.reason);
    }

    const generatedSecret =
      signingSecret || `whsec_${crypto.randomBytes(24).toString('hex')}`;

    const subscription = await WebhookSubscription.create({
      organization: req.organization._id,
      name,
      targetUrl,
      events,
      signingSecret: generatedSecret,
      headers: headers || {},
      maxRetries: maxRetries ?? 3,
      timeoutMs: timeoutMs ?? 10000,
      isActive: isActive ?? true,
      createdByClient: req.developerClient.clientId
    });

    const responseObj = subscription.toObject ? subscription.toObject() : { ...subscription };
    responseObj.signingSecret = generatedSecret; // Shown once on creation

    return sendDeveloperSuccess(req, res, 201, { subscription: responseObj });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'WEBHOOK_CREATE_ERROR', err.message || 'Failed to create webhook subscription.');
  }
};

exports.updateSubscription = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid subscription ID format.');
    }

    if (req.body.targetUrl) {
      const urlValidation = outboundWebhookService.validateWebhookTargetUrl(req.body.targetUrl);
      if (!urlValidation.valid) {
        return sendDeveloperError(req, res, 400, 'INVALID_TARGET_URL', urlValidation.reason);
      }
    }

    const allowedFields = [
      'name',
      'targetUrl',
      'events',
      'signingSecret',
      'headers',
      'maxRetries',
      'timeoutMs',
      'isActive'
    ];
    const updates = {};
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) {
        updates[f] = req.body[f];
      }
    }

    const subscription = await WebhookSubscription.findOneAndUpdate(
      { _id: req.params.id, organization: req.organization._id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!subscription) {
      return sendDeveloperError(req, res, 404, 'SUBSCRIPTION_NOT_FOUND', 'Webhook subscription not found in workspace.');
    }

    return sendDeveloperSuccess(req, res, 200, { subscription });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'WEBHOOK_UPDATE_ERROR', 'Failed to update webhook subscription.');
  }
};

exports.deleteSubscription = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid subscription ID format.');
    }

    const subscription = await WebhookSubscription.findOneAndDelete({
      _id: req.params.id,
      organization: req.organization._id
    });

    if (!subscription) {
      return sendDeveloperError(req, res, 404, 'SUBSCRIPTION_NOT_FOUND', 'Webhook subscription not found in workspace.');
    }

    return sendDeveloperSuccess(req, res, 200, { deletedId: req.params.id });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'WEBHOOK_DELETE_ERROR', 'Failed to delete webhook subscription.');
  }
};

exports.testSubscription = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid subscription ID format.');
    }

    const subscription = await WebhookSubscription.findOne({
      _id: req.params.id,
      organization: req.organization._id
    }).select('+signingSecret');

    if (!subscription) {
      return sendDeveloperError(req, res, 404, 'SUBSCRIPTION_NOT_FOUND', 'Webhook subscription not found in workspace.');
    }

    const payload = {
      id: `evt_ping_${crypto.randomBytes(8).toString('hex')}`,
      event: 'webhook.ping',
      organizationId: String(req.organization._id),
      createdAt: new Date().toISOString(),
      data: {
        message: 'Graxion Flow Developer API webhook verification ping',
        subscriptionId: String(subscription._id)
      }
    };

    const delivery = await WebhookDelivery.create({
      organization: req.organization._id,
      subscription: subscription._id,
      event: 'webhook.ping',
      targetUrl: subscription.targetUrl,
      payload,
      signature: 'pending',
      status: 'PENDING',
      attemptCount: 0,
      maxRetries: subscription.maxRetries
    });

    const completedDelivery = await outboundWebhookService.executeDelivery(delivery, subscription);

    return sendDeveloperSuccess(req, res, 200, { delivery: completedDelivery });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'WEBHOOK_TEST_ERROR', 'Failed to dispatch test webhook.');
  }
};

exports.listDeliveries = async (req, res) => {
  try {
    const { subscriptionId, status, event, page = 1, limit = 30 } = req.query;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30));

    const query = { organization: req.organization._id };
    if (subscriptionId && mongoose.Types.ObjectId.isValid(subscriptionId)) {
      query.subscription = subscriptionId;
    }
    if (status) query.status = status;
    if (event) query.event = event;

    const [deliveries, total] = await Promise.all([
      WebhookDelivery.find(query)
        .sort('-createdAt')
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      WebhookDelivery.countDocuments(query)
    ]);

    return sendDeveloperSuccess(
      req,
      res,
      200,
      { deliveries },
      {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1
      }
    );
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'DELIVERIES_LIST_ERROR', 'Failed to list webhook deliveries.');
  }
};

exports.retryDelivery = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid delivery ID format.');
    }

    const delivery = await WebhookDelivery.findOne({
      _id: req.params.id,
      organization: req.organization._id
    });

    if (!delivery) {
      return sendDeveloperError(req, res, 404, 'DELIVERY_NOT_FOUND', 'Webhook delivery record not found in workspace.');
    }

    const subscription = await WebhookSubscription.findOne({
      _id: delivery.subscription,
      organization: req.organization._id
    }).select('+signingSecret');

    if (!subscription) {
      return sendDeveloperError(req, res, 404, 'SUBSCRIPTION_NOT_FOUND', 'Associated webhook subscription no longer exists.');
    }

    const retried = await outboundWebhookService.executeDelivery(delivery, subscription);

    return sendDeveloperSuccess(req, res, 200, { delivery: retried });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'DELIVERY_RETRY_ERROR', 'Failed to retry webhook delivery.');
  }
};
