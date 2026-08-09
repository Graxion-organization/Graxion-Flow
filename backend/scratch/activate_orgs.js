const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database!');

    const OrgSchema = new mongoose.Schema({}, { strict: false, collection: 'organizations' });
    const Organization = mongoose.models.Organization || mongoose.model('Organization', OrgSchema);

    // Set all organizations owned by the user to active
    const ownerId = new mongoose.Types.ObjectId("6a0769e5feb75f5af9d1fe0a");
    const result = await Organization.updateMany(
      { owner: ownerId },
      { $set: { isActive: true } }
    );

    console.log(`Successfully updated ${result.modifiedCount} organization(s) to isActive: true.`);

  } catch (err) {
    console.error('Error activating organizations:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
