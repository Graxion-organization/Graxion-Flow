const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database!');

    const User = require('../src/models/User');

    const userId = "6a0769e5feb75f5af9d1fe0a";
    const user = await User.findById(userId).select('-__v');
    
    console.log('\n=== USER DOCUMENT FROM FIND_BY_ID ===');
    console.log('Has subscription:', !!user.subscription);
    console.log('Subscription:', JSON.stringify(user.subscription, null, 2));

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
