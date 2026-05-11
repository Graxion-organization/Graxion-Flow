const mongoose = require('mongoose');
const SocialPostJob = require('./backend/src/models/SocialPostJob');
require('dotenv').config({ path: './backend/.env' });

async function audit() {
  await mongoose.connect(process.env.MONGODB_URI);
  const job = await SocialPostJob.findOne({ user: '69e278d85a360de80b94bf9c' }).sort({ createdAt: -1 });
  console.log('--- LATEST JOB AUDIT ---');
  console.log('Job ID:', job._id);
  console.log('Overall Status:', job.overallStatus);
  console.log('Executions:', JSON.stringify(job.executions, null, 2));
  process.exit(0);
}

audit();
