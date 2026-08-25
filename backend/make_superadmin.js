require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const emailToPromote = 'yogeshkaushik138@gmail.com';

async function makeSuperAdmin() {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      console.error("No MongoDB URI found in environment variables (MONGODB_URI or MONGO_URI).");
      process.exit(1);
    }
    
    await mongoose.connect(uri);
    
    console.log('Connected to MongoDB.');
    
    const user = await User.findOneAndUpdate(
      { email: emailToPromote },
      { $set: { role: 'superadmin' } },
      { new: true }
    );
    
    if (user) {
      console.log(`\n🎉 Success! User ${user.email} is now a superadmin.`);
    } else {
      console.log(`\n❌ User with email ${emailToPromote} not found.`);
    }
    
  } catch (err) {
    console.error('\nError:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
}

makeSuperAdmin();
