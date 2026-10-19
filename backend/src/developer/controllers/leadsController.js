const mongoose = require('mongoose');
const leadIntelligenceService = require('../../services/leadIntelligenceService');
const { sendDeveloperSuccess, sendDeveloperError } = require('../middleware/requestContext');

exports.listLeads = async (req, res) => {
  try {
    const {
      platform,
      status,
      search,
      minScore,
      engagementLevel,
      since,
      until,
      page = 1,
      limit = 20
    } = req.query;

    const result = await leadIntelligenceService.queryLeads({
      baseFilter: { organization: req.organization._id },
      platform,
      status,
      search,
      minScore,
      engagementLevel,
      since,
      until,
      page,
      limit
    });

    return sendDeveloperSuccess(
      req,
      res,
      200,
      {
        leads: result.leads,
        summary: result.summary
      },
      {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    );
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'LEADS_QUERY_ERROR', 'Failed to retrieve leads.');
  }
};

exports.getLead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid conversationId format.');
    }

    const detail = await leadIntelligenceService.getLeadById(req.organization._id, conversationId);
    if (!detail) {
      return sendDeveloperError(
        req,
        res,
        404,
        'LEAD_NOT_FOUND',
        'Conversation lead not found in this organization workspace.'
      );
    }

    return sendDeveloperSuccess(req, res, 200, detail);
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'LEAD_FETCH_ERROR', 'Failed to retrieve lead details.');
  }
};
