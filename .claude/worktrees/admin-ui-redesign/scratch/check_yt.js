const mongoose = require('mongoose');
const User = require('./backend/src/models/User');
require('dotenv').config({ path: './backend/.env' });

async function checkYoutube() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const users = await User.find({ 'youtube.connected': true });
  console.log(`Found ${users.length} connected users`);

  for (const user of users) {
    console.log(`User: ${user.email}`);
    console.log(`- Channel: ${user.youtube.channelName}`);
    console.log(`- Access Token: ${user.youtube.accessToken ? 'Present' : 'Missing'}`);
    console.log(`- Refresh Token: ${user.youtube.refreshToken ? 'Present' : 'Missing'}`);
    console.log(`- Expiry: ${user.youtube.tokenExpiry}`);
  }

  await mongoose.disconnect();
}

checkYoutube().catch(console.error);
