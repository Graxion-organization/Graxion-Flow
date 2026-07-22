const Contact = require('../models/Contact');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const csv = require('csv-parser');
const fs = require('fs');
const { parse } = require('json2csv');

const getOrgId = (req) => req.organization?._id || req.user?.organization || req.user?.currentOrganization;

exports.getAllContacts = catchAsync(async (req, res, next) => {
  const { search, page = 1, limit = 50 } = req.query;
  const orgId = getOrgId(req);
  const query = { organization: orgId };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  const contacts = await Contact.find(query)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Contact.countDocuments(query);

  res.status(200).json({
    status: 'success',
    results: contacts.length,
    data: { contacts, total, pages: Math.ceil(total / limit) }
  });
});

exports.getContact = catchAsync(async (req, res, next) => {
  const orgId = getOrgId(req);
  const contact = await Contact.findOne({ _id: req.params.id, organization: orgId });
  if (!contact) return next(new AppError('Contact not found', 404));
  res.status(200).json({ status: 'success', data: { contact } });
});

exports.createContact = catchAsync(async (req, res, next) => {
  const orgId = getOrgId(req);
  if (!orgId) {
    return next(new AppError('Organization context missing. Please refresh or re-select organization.', 400));
  }
  const contact = await Contact.create({ ...req.body, organization: orgId });
  res.status(201).json({ status: 'success', data: { contact } });
});

exports.updateContact = catchAsync(async (req, res, next) => {
  const orgId = getOrgId(req);
  const contact = await Contact.findOneAndUpdate(
    { _id: req.params.id, organization: orgId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!contact) return next(new AppError('Contact not found', 404));
  res.status(200).json({ status: 'success', data: { contact } });
});

exports.deleteContact = catchAsync(async (req, res, next) => {
  const orgId = getOrgId(req);
  const contact = await Contact.findOneAndDelete({ _id: req.params.id, organization: orgId });
  if (!contact) return next(new AppError('Contact not found', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.importContacts = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload a CSV file', 400));
  const orgId = getOrgId(req);
  if (!orgId) {
    return next(new AppError('Organization context missing.', 400));
  }
  
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        const ops = results.map(row => ({
          updateOne: {
            filter: { organization: orgId, phone: row.phone },
            update: { $set: { ...row, organization: orgId } },
            upsert: true
          }
        }));
        
        const result = await Contact.bulkWrite(ops);
        fs.unlinkSync(req.file.path); // remove temp file
        
        res.status(200).json({
          status: 'success',
          message: `Imported ${result.upsertedCount + result.modifiedCount} contacts`
        });
      } catch (err) {
        return next(new AppError('Import failed: ' + err.message, 500));
      }
    });
});

exports.exportContacts = catchAsync(async (req, res, next) => {
  const orgId = getOrgId(req);
  const contacts = await Contact.find({ organization: orgId }).lean();
  
  if (!contacts.length) return next(new AppError('No contacts to export', 404));
  
  const csvData = parse(contacts, { fields: ['name', 'phone', 'email', 'optIn', 'createdAt'] });
  
  res.header('Content-Type', 'text/csv');
  res.attachment('contacts.csv');
  return res.send(csvData);
});