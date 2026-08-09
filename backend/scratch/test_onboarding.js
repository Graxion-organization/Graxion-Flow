const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database!');

    const User = require('../src/models/User');
    const Organization = require('../src/models/Organization');
    const Agent = require('../src/models/Agent');
    const WhatsappAccount = require('../src/models/WhatsappAccount');
    const FacebookAccount = require('../src/models/FacebookAccount');
    const InstagramAccount = require('../src/models/InstagramAccount');
    const TelegramAccount = require('../src/models/TelegramAccount');
    const Integration = require('../src/models/Integration');
    const YoutubeAccount = require('../src/models/YoutubeAccount');
    const LinkedInAccount = require('../src/models/LinkedInAccount');

    const email = 'yogeshkaushik138@gmail.com';
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found!');
      return;
    }

    const orgs = await Organization.find({ 'members.user': user._id });
    console.log(`\nUser belongs to ${orgs.length} organizations:`);
    
    for (const org of orgs) {
      const orgId = org._id;
      const [
        agentsCount,
        waCount,
        fbCount,
        igCount,
        tgCount,
        intCount,
        ytCount,
        liCount
      ] = await Promise.all([
        Agent.countDocuments({ organization: orgId }),
        WhatsappAccount.countDocuments({ organization: orgId }),
        FacebookAccount.countDocuments({ organization: orgId }),
        InstagramAccount.countDocuments({ organization: orgId }),
        TelegramAccount.countDocuments({ organization: orgId }),
        Integration.countDocuments({ organization: orgId }),
        YoutubeAccount.countDocuments({ organization: orgId }),
        LinkedInAccount.countDocuments({ organization: orgId })
      ]);

      const hasIntegration = (waCount + fbCount + igCount + tgCount + intCount + ytCount + liCount) > 0;
      console.log(`\n- Organization: "${org.name}" | ID: ${org._id} | isActive: ${org.isActive}`);
      console.log(`  WhatsApp Accounts: ${waCount}`);
      console.log(`  Facebook Accounts: ${fbCount}`);
      console.log(`  Instagram Accounts: ${igCount}`);
      console.log(`  Telegram Accounts: ${tgCount}`);
      console.log(`  YouTube Accounts: ${ytCount}`);
      console.log(`  LinkedIn Accounts: ${liCount}`);
      console.log(`  Integrations: ${intCount}`);
      console.log(`  Agents: ${agentsCount}`);
      console.log(`  -> hasIntegration: ${hasIntegration}`);
    }

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected.');
  }
}

run();
