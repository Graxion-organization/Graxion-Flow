const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database!');

    const PlanSchema = new mongoose.Schema({}, { strict: false, collection: 'plans' });
    const Plan = mongoose.models.Plan || mongoose.model('Plan', PlanSchema);

    const plans = await Plan.find({});
    console.log('\n=== PLANS IN DATABASE ===');
    plans.forEach(p => {
      console.log(`Code: ${p.code} | Name: ${p.name} | Price: ${p.price} | isActive: ${p.isActive}`);
    });

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
