const mongoose = require('mongoose');
const Contact = require('../../models/Contact');
const Deal = require('../../models/Deal');
const outboundWebhookService = require('../../services/outboundWebhookService');
const { sendDeveloperSuccess, sendDeveloperError } = require('../middleware/requestContext');

// ─── CONTACTS ───────────────────────────────────────────────────────────────

exports.listContacts = async (req, res) => {
  try {
    const { search, tag, optIn, source, page = 1, limit = 50 } = req.query;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

    const query = { organization: req.organization._id };
    if (tag) query.tags = tag;
    if (source) query.source = source;
    if (optIn !== undefined) query.optIn = optIn === 'true';
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const [contacts, total] = await Promise.all([
      Contact.find(query)
        .sort('-createdAt')
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      Contact.countDocuments(query)
    ]);

    return sendDeveloperSuccess(
      req,
      res,
      200,
      { contacts },
      {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1
      }
    );
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'CONTACTS_LIST_ERROR', 'Failed to list contacts.');
  }
};

exports.getContact = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid contact ID format.');
    }

    const contact = await Contact.findOne({
      _id: req.params.id,
      organization: req.organization._id
    }).lean();

    if (!contact) {
      return sendDeveloperError(req, res, 404, 'CONTACT_NOT_FOUND', 'Contact not found in workspace.');
    }

    return sendDeveloperSuccess(req, res, 200, { contact });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'CONTACT_GET_ERROR', 'Failed to retrieve contact.');
  }
};

exports.createContact = async (req, res) => {
  try {
    const { name, phone, email, tags, customFields, optIn, source } = req.body;
    const normalizedPhone = String(phone).trim();

    const existing = await Contact.findOne({
      organization: req.organization._id,
      phone: normalizedPhone
    });
    if (existing) {
      return sendDeveloperError(
        req,
        res,
        409,
        'CONTACT_ALREADY_EXISTS',
        'A contact with this phone number already exists in the workspace.'
      );
    }

    const contact = await Contact.create({
      organization: req.organization._id,
      name,
      phone: normalizedPhone,
      email: email || undefined,
      tags: tags || [],
      customFields: customFields || {},
      optIn: optIn !== undefined ? optIn : true,
      source: source || 'developer_api'
    });

    outboundWebhookService
      .dispatchWebhookEvent(req.organization._id, 'contact.created', { contact })
      .catch(() => {});

    return sendDeveloperSuccess(req, res, 201, { contact });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'CONTACT_CREATE_ERROR', err.message || 'Failed to create contact.');
  }
};

exports.updateContact = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid contact ID format.');
    }

    const allowedUpdates = {};
    const fields = ['name', 'phone', 'email', 'tags', 'customFields', 'optIn', 'source'];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        allowedUpdates[f] = req.body[f];
      }
    }

    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, organization: req.organization._id },
      { $set: allowedUpdates },
      { new: true, runValidators: true }
    );

    if (!contact) {
      return sendDeveloperError(req, res, 404, 'CONTACT_NOT_FOUND', 'Contact not found in workspace.');
    }

    outboundWebhookService
      .dispatchWebhookEvent(req.organization._id, 'contact.updated', { contact })
      .catch(() => {});

    return sendDeveloperSuccess(req, res, 200, { contact });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'CONTACT_UPDATE_ERROR', 'Failed to update contact.');
  }
};

exports.deleteContact = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid contact ID format.');
    }

    const contact = await Contact.findOneAndDelete({
      _id: req.params.id,
      organization: req.organization._id
    });

    if (!contact) {
      return sendDeveloperError(req, res, 404, 'CONTACT_NOT_FOUND', 'Contact not found in workspace.');
    }

    return sendDeveloperSuccess(req, res, 200, { deletedId: req.params.id });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'CONTACT_DELETE_ERROR', 'Failed to delete contact.');
  }
};

// ─── DEALS ──────────────────────────────────────────────────────────────────

exports.listDeals = async (req, res) => {
  try {
    const { stage, contactId, minAmount, page = 1, limit = 50 } = req.query;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));

    const query = { organization: req.organization._id };
    if (stage) query.stage = stage;
    if (contactId && mongoose.Types.ObjectId.isValid(contactId)) {
      query.contact = contactId;
    }
    if (minAmount !== undefined && !Number.isNaN(Number(minAmount))) {
      query.amount = { $gte: Number(minAmount) };
    }

    const [deals, total] = await Promise.all([
      Deal.find(query)
        .populate('contact', 'name phone email')
        .sort('-createdAt')
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean(),
      Deal.countDocuments(query)
    ]);

    return sendDeveloperSuccess(
      req,
      res,
      200,
      { deals },
      {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 1
      }
    );
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'DEALS_LIST_ERROR', 'Failed to list deals.');
  }
};

exports.getDeal = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid deal ID format.');
    }

    const deal = await Deal.findOne({
      _id: req.params.id,
      organization: req.organization._id
    })
      .populate('contact', 'name phone email')
      .lean();

    if (!deal) {
      return sendDeveloperError(req, res, 404, 'DEAL_NOT_FOUND', 'Deal not found in workspace.');
    }

    return sendDeveloperSuccess(req, res, 200, { deal });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'DEAL_GET_ERROR', 'Failed to retrieve deal.');
  }
};

exports.createDeal = async (req, res) => {
  try {
    const { contactId, title, amount, stage, expectedCloseDate, notes } = req.body;
    if (!mongoose.Types.ObjectId.isValid(contactId)) {
      return sendDeveloperError(req, res, 400, 'INVALID_CONTACT_ID', 'Invalid contactId format.');
    }

    const contact = await Contact.findOne({
      _id: contactId,
      organization: req.organization._id
    });
    if (!contact) {
      return sendDeveloperError(
        req,
        res,
        404,
        'CONTACT_NOT_FOUND',
        'Referenced contact does not exist in this organization workspace.'
      );
    }

    const deal = await Deal.create({
      organization: req.organization._id,
      contact: contact._id,
      title,
      amount: amount || 0,
      stage: stage || 'LEAD',
      expectedCloseDate: expectedCloseDate || undefined,
      notes: notes || undefined
    });

    if (Array.isArray(contact.timeline)) {
      contact.timeline.push({
        type: 'NOTE',
        title: 'Deal Created (Developer API)',
        description: `Deal "${title}" created at stage ${deal.stage}`,
        metadata: { dealId: deal._id }
      });
      await contact.save();
    }

    outboundWebhookService
      .dispatchWebhookEvent(req.organization._id, 'deal.created', { deal })
      .catch(() => {});

    return sendDeveloperSuccess(req, res, 201, { deal });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'DEAL_CREATE_ERROR', 'Failed to create deal.');
  }
};

exports.updateDeal = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid deal ID format.');
    }

    const deal = await Deal.findOne({
      _id: req.params.id,
      organization: req.organization._id
    });

    if (!deal) {
      return sendDeveloperError(req, res, 404, 'DEAL_NOT_FOUND', 'Deal not found in workspace.');
    }

    const previousStage = deal.stage;
    const allowedFields = ['title', 'amount', 'stage', 'expectedCloseDate', 'notes'];
    for (const f of allowedFields) {
      if (req.body[f] !== undefined) {
        deal[f] = req.body[f];
      }
    }

    await deal.save();

    if (req.body.stage && req.body.stage !== previousStage) {
      outboundWebhookService
        .dispatchWebhookEvent(req.organization._id, 'deal.stage_changed', {
          deal,
          previousStage,
          newStage: deal.stage
        })
        .catch(() => {});
    }

    return sendDeveloperSuccess(req, res, 200, { deal });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'DEAL_UPDATE_ERROR', 'Failed to update deal.');
  }
};

exports.deleteDeal = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendDeveloperError(req, res, 400, 'INVALID_ID', 'Invalid deal ID format.');
    }

    const deal = await Deal.findOneAndDelete({
      _id: req.params.id,
      organization: req.organization._id
    });

    if (!deal) {
      return sendDeveloperError(req, res, 404, 'DEAL_NOT_FOUND', 'Deal not found in workspace.');
    }

    return sendDeveloperSuccess(req, res, 200, { deletedId: req.params.id });
  } catch (err) {
    return sendDeveloperError(req, res, 500, 'DEAL_DELETE_ERROR', 'Failed to delete deal.');
  }
};
