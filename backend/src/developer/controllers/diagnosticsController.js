const ApiUsageLog = require('../../models/ApiUsageLog');
const RateLimitConfig = require('../../models/RateLimitConfig');
const WebhookLog = require('../../models/WebhookLog');
const DeveloperAuditLog = require('../../models/DeveloperAuditLog');
const { sendDeveloperSuccess, sendDeveloperError } = require('../middleware/requestContext');

exports.getUsageDiagnostics = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const lookbackHours = Math.min(720, Math.max(1, Number(hours) || 24));
    const sinceDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000);

    const ownerId = req.organization.owner || req.organization._id;

    const [usageBuckets, limitConfig, auditStats] = await Promise.all([
      ApiUsageLog.find({
        user: ownerId,
        bucketTime: { $gte: sinceDate }
      })
        .sort({ bucketTime: 1 })
        .lean(),
      RateLimitConfig.findOne({ scope: 'global', platform: 'all' })
        .lean()
        .catch(() => null),
      DeveloperAuditLog.aggregate([
        {
          $match: {
            organization: req.organization._id,
            createdAt: { $gte: sinceDate }
          }
        },
        {
          $group: {
            _id: null,
            totalDeveloperRequests: { $sum: 1 },
            avgLatencyMs: { $avg: '$latencyMs' },
            errorCount: {
              $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] }
            }
          }
        }
      ])
    ]);

    const totals = usageBuckets.reduce(
      (acc, b) => {
        acc.apiCalls += b.apiCalls || 0;
        acc.webhooks += b.webhooks || 0;
        return acc;
      },
      { apiCalls: 0, webhooks: 0 }
    );

    const devStats = auditStats[0] || {
      totalDeveloperRequests: 0,
      avgLatencyMs: 0,
      errorCount: 0
    };

    return sendDeveloperSuccess(req, res, 200, {
      organizationId: req.organization._id,
      windowHours: lookbackHours,
      limits: {
        limitPerHour: limitConfig?.limitPerHour || 1000,
        limitPerDay: limitConfig?.limitPerDay || 10000,
        s2sClientRateLimitPerMinute: req.developerClient.rateLimitPerMinute || 600
      },
      usageTotals: totals,
      developerApiMetrics: {
        totalRequests: devStats.totalDeveloperRequests,
        avgLatencyMs: Math.round(devStats.avgLatencyMs || 0),
        errorCount: devStats.errorCount
      },
      hourlyBuckets: usageBuckets
    });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'USAGE_DIAGNOSTICS_ERROR', 'Failed to retrieve usage diagnostics.');
  }
};

exports.getRequestDiagnostics = async (req, res) => {
  try {
    const { statusCode, method, requestId, page = 1, limit = 50 } = req.query;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

    const query = { organization: req.organization._id };
    if (statusCode) query.statusCode = Number(statusCode);
    if (method) query.method = String(method).toUpperCase();
    if (requestId) query.requestId = String(requestId);

    const [logs, total] = await Promise.all([
      DeveloperAuditLog.find(query)
        .sort('-createdAt')
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      DeveloperAuditLog.countDocuments(query)
    ]);

    return sendDeveloperSuccess(
      req,
      res,
      200,
      { requests: logs },
      {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1
      }
    );
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'REQUEST_DIAGNOSTICS_ERROR', 'Failed to retrieve request diagnostics.');
  }
};

exports.getInboundWebhookDiagnostics = async (req, res) => {
  try {
    const { platform, status, limit = 50 } = req.query;
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

    const query = {};
    if (platform) query.platform = platform;
    if (status) query.status = status;

    const logs = await WebhookLog.find(query)
      .select('platform eventType status processedAt error createdAt')
      .sort('-createdAt')
      .limit(safeLimit)
      .lean();

    return sendDeveloperSuccess(req, res, 200, { inboundWebhooks: logs }, { total: logs.length });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'WEBHOOK_DIAGNOSTICS_ERROR', 'Failed to retrieve inbound webhook diagnostics.');
  }
};
