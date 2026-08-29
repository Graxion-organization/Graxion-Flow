const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/graxion').then(async () => {
  const IgAccount = require('./src/models/InstagramAccount');
  const Agent = require('./src/models/Agent');
  
  const accounts = await IgAccount.find({ 
    igUsername: { $in: ['official_ankushdixit', 'official_pandit_31', 'graxionflow', 'graxion_flow'] } 
  });
  
  console.log('Found accounts:', accounts.map(a => a.igUsername));
  
  for (const acc of accounts) {
      console.log('\nAccount:', acc.igUsername);
      console.log('Bot Enabled:', acc.botEnabled, 'Comment Bot:', acc.commentBotEnabled);
      console.log('Messenger Prompt:', acc.messengerBotPrompt ? acc.messengerBotPrompt.substring(0, 50) + '...' : null);
      
      const agent = await Agent.findOne({ instagramAccount: acc._id });
      if (agent) {
          console.log('Agent Model:', agent.model, 'Provider:', agent.aiProvider);
      } else {
          console.log('No specific agent linked.');
      }
  }
  process.exit(0);
}).catch(console.error);
