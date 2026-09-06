const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/graxion-flow').then(async () => {
  const templates = await mongoose.connection.collection('templates').find().toArray();
  console.log(templates.map(t => ({ name: t.name, language: t.language, status: t.status })));
  process.exit(0);
}).catch(err => { console.error(err); process.exit(1); });
