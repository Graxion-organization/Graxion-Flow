const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
console.log('Connecting to:', MONGODB_URI);

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // Define schemas dynamically to avoid model compilation issues
    const UserSchema = new mongoose.Schema({}, { strict: false, collection: 'users' });
    const OrgSchema = new mongoose.Schema({}, { strict: false, collection: 'organizations' });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Organization = mongoose.models.Organization || mongoose.model('Organization', OrgSchema);

    const users = await User.find({});
    console.log(`\n=== USERS (Found: ${users.length}) ===`);
    users.forEach(u => {
      console.log(`User: ${u.name} (${u.email}) | ID: ${u._id} | currentOrganization: ${u.currentOrganization} | isActive: ${u.isActive}`);
    });

    const orgs = await Organization.find({});
    console.log(`\n=== ORGANIZATIONS (Found: ${orgs.length}) ===`);
    orgs.forEach(o => {
      console.log(`Org Name: ${o.name} | ID: ${o._id} | Owner: ${o.owner} | isActive: ${o.isActive}`);
      console.log('Members:', JSON.stringify(o.members, null, 2));
    });

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
  }
}

run();
