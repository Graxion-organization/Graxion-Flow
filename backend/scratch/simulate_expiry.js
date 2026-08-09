const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database!');

    const User = require('../src/models/User');
    const Organization = require('../src/models/Organization');

    const email = 'yogeshkaushik138@gmail.com';
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log('Before update subscription:', JSON.stringify(user.subscription, null, 2));

    // Simulate downgrade
    user.subscription.lastPlan = 'enterprise';
    user.subscription.plan = 'free';
    user.subscription.status = 'active';
    user.subscription.currentPeriodEnd = undefined;
    user.subscription.messageLimit = 100;
    user.subscription.agentLimit = 1;
    user.subscription.credits = 0;
    user.subscription.totalCredits = 0;
    
    await user.save();

    console.log('After update subscription:', JSON.stringify(user.subscription, null, 2));

    // Ensure all workspaces owned by the user are active
    const orgRes = await Organization.updateMany({ owner: user._id }, { isActive: true });
    console.log('Workspaces updated:', orgRes);

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
