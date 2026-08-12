const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://yogeshkaushik:Kaushik138@cluster0.zut47zv.mongodb.net/whatsapp_saas').then(async () => {
  const WA = require('./src/models/WhatsappAccount');
  const FB = require('./src/models/FacebookAccount');
  const waAccs = await WA.aggregate([{ $group: { _id: '$phoneNumberId', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]);
  const fbAccs = await FB.aggregate([{ $group: { _id: '$pageId', count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }]);
  console.log('WA duplicates:', waAccs);
  console.log('FB duplicates:', fbAccs);
  process.exit(0);
});
