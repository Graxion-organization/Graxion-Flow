const mongoose = require('mongoose');
const PostAutomation = require('./backend/src/models/PostAutomation');
require('dotenv').config({ path: './backend/.env' });

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/graxion')
  .then(async () => {
    console.log("Connected");
    const automations = await PostAutomation.find({});
    console.log(automations);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
