const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database!');

    const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    const user = await User.findOne({ email: 'yogeshkaushik138@gmail.com' });
    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log('\n=== USER SUBSCRIPTION DETAILS ===');
    console.log(JSON.stringify(user.subscription, null, 2));

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
