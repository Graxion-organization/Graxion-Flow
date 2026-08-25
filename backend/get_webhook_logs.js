const mongoose = require('mongoose');
const WebhookLog = require('./src/models/WebhookLog');
require('dotenv').config({ path: './.env' });
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/graxion').then(async () => {
  const logs = await WebhookLog.find({ platform: { $in: ['instagram', 'facebook'] } })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  console.log(JSON.stringify(logs, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
