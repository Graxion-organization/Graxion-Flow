const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');
const routesDir = path.join(__dirname, 'src', 'routes');

const controllers = {
  'contactController.js': `const Contact = require('../models/Contact');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const csv = require('csv-parser');
const fs = require('fs');
const { parse } = require('json2csv');

exports.getAllContacts = catchAsync(async (req, res, next) => {
  const { search, page = 1, limit = 50 } = req.query;
  const query = { organization: req.user.organization };

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
  const contact = await Contact.findOne({ _id: req.params.id, organization: req.user.organization });
  if (!contact) return next(new AppError('Contact not found', 404));
  res.status(200).json({ status: 'success', data: { contact } });
});

exports.createContact = catchAsync(async (req, res, next) => {
  const contact = await Contact.create({ ...req.body, organization: req.user.organization });
  res.status(201).json({ status: 'success', data: { contact } });
});

exports.updateContact = catchAsync(async (req, res, next) => {
  const contact = await Contact.findOneAndUpdate(
    { _id: req.params.id, organization: req.user.organization },
    req.body,
    { new: true, runValidators: true }
  );
  if (!contact) return next(new AppError('Contact not found', 404));
  res.status(200).json({ status: 'success', data: { contact } });
});

exports.deleteContact = catchAsync(async (req, res, next) => {
  const contact = await Contact.findOneAndDelete({ _id: req.params.id, organization: req.user.organization });
  if (!contact) return next(new AppError('Contact not found', 404));
  res.status(204).json({ status: 'success', data: null });
});

exports.importContacts = catchAsync(async (req, res, next) => {
  if (!req.file) return next(new AppError('Please upload a CSV file', 400));
  
  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        const ops = results.map(row => ({
          updateOne: {
            filter: { organization: req.user.organization, phone: row.phone },
            update: { $set: { ...row, organization: req.user.organization } },
            upsert: true
          }
        }));
        
        const result = await Contact.bulkWrite(ops);
        fs.unlinkSync(req.file.path); // remove temp file
        
        res.status(200).json({
          status: 'success',
          message: \`Imported \${result.upsertedCount + result.modifiedCount} contacts\`
        });
      } catch (err) {
        return next(new AppError('Import failed: ' + err.message, 500));
      }
    });
});

exports.exportContacts = catchAsync(async (req, res, next) => {
  const contacts = await Contact.find({ organization: req.user.organization }).lean();
  
  if (!contacts.length) return next(new AppError('No contacts to export', 404));
  
  const csvData = parse(contacts, { fields: ['name', 'phone', 'email', 'optIn', 'createdAt'] });
  
  res.header('Content-Type', 'text/csv');
  res.attachment('contacts.csv');
  return res.send(csvData);
});`,

  'contactGroupController.js': `const ContactGroup = require('../models/ContactGroup');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllGroups = catchAsync(async (req, res, next) => {
  const groups = await ContactGroup.find({ organization: req.user.organization }).sort('-createdAt');
  res.status(200).json({ status: 'success', data: { groups } });
});

exports.createGroup = catchAsync(async (req, res, next) => {
  const group = await ContactGroup.create({ ...req.body, organization: req.user.organization });
  res.status(201).json({ status: 'success', data: { group } });
});

exports.updateGroup = catchAsync(async (req, res, next) => {
  const group = await ContactGroup.findOneAndUpdate(
    { _id: req.params.id, organization: req.user.organization },
    req.body,
    { new: true, runValidators: true }
  );
  if (!group) return next(new AppError('Group not found', 404));
  res.status(200).json({ status: 'success', data: { group } });
});

exports.deleteGroup = catchAsync(async (req, res, next) => {
  const group = await ContactGroup.findOneAndDelete({ _id: req.params.id, organization: req.user.organization });
  if (!group) return next(new AppError('Group not found', 404));
  res.status(204).json({ status: 'success', data: null });
});`,

  'optOutController.js': `const OptOut = require('../models/OptOut');
const Contact = require('../models/Contact');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.getAllOptOuts = catchAsync(async (req, res, next) => {
  const optOuts = await OptOut.find({ organization: req.user.organization }).sort('-createdAt');
  res.status(200).json({ status: 'success', data: { optOuts } });
});

exports.addOptOut = catchAsync(async (req, res, next) => {
  const { phone, reason } = req.body;
  const optOut = await OptOut.findOneAndUpdate(
    { organization: req.user.organization, phone },
    { reason, optOutAt: Date.now() },
    { upsert: true, new: true }
  );
  
  await Contact.updateOne({ organization: req.user.organization, phone }, { optIn: false });
  
  res.status(201).json({ status: 'success', data: { optOut } });
});

exports.removeOptOut = catchAsync(async (req, res, next) => {
  const { phone } = req.params;
  await OptOut.findOneAndDelete({ organization: req.user.organization, phone });
  await Contact.updateOne({ organization: req.user.organization, phone }, { optIn: true });
  res.status(204).json({ status: 'success', data: null });
});`
};

const routes = {
  'contacts.js': `const express = require('express');
const contactController = require('../controllers/contactController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();
router.use(protect);

router.post('/import', upload.single('file'), contactController.importContacts);
router.get('/export', contactController.exportContacts);

router
  .route('/')
  .get(contactController.getAllContacts)
  .post(contactController.createContact);

router
  .route('/:id')
  .get(contactController.getContact)
  .patch(contactController.updateContact)
  .delete(contactController.deleteContact);

module.exports = router;`,

  'contactGroups.js': `const express = require('express');
const contactGroupController = require('../controllers/contactGroupController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router
  .route('/')
  .get(contactGroupController.getAllGroups)
  .post(contactGroupController.createGroup);

router
  .route('/:id')
  .patch(contactGroupController.updateGroup)
  .delete(contactGroupController.deleteGroup);

module.exports = router;`,

  'optOuts.js': `const express = require('express');
const optOutController = require('../controllers/optOutController');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

router
  .route('/')
  .get(optOutController.getAllOptOuts)
  .post(optOutController.addOptOut);

router
  .route('/:phone')
  .delete(optOutController.removeOptOut);

module.exports = router;`
};

for (const [filename, code] of Object.entries(controllers)) {
  fs.writeFileSync(path.join(controllersDir, filename), code);
}
for (const [filename, code] of Object.entries(routes)) {
  fs.writeFileSync(path.join(routesDir, filename), code);
}
console.log('Created Phase 5 CRM files');
