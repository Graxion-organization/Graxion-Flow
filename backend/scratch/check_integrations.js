const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database!');

    // Define schemas
    const AccountSchema = new mongoose.Schema({}, { strict: false });
    const WhatsappAccount = mongoose.models.WhatsappAccount || mongoose.model('WhatsappAccount', AccountSchema, 'whatsappaccounts');
    const InstagramAccount = mongoose.models.InstagramAccount || mongoose.model('InstagramAccount', AccountSchema, 'instagramaccounts');
    const FacebookAccount = mongoose.models.FacebookAccount || mongoose.model('FacebookAccount', AccountSchema, 'facebookaccounts');
    const TelegramAccount = mongoose.models.TelegramAccount || mongoose.model('TelegramAccount', AccountSchema, 'telegramaccounts');
    const YoutubeAccount = mongoose.models.YoutubeAccount || mongoose.model('YoutubeAccount', AccountSchema, 'youtubeaccounts');

    const [wa, ig, fb, tg, yt] = await Promise.all([
      WhatsappAccount.find({}),
      InstagramAccount.find({}),
      FacebookAccount.find({}),
      TelegramAccount.find({}),
      YoutubeAccount.find({})
    ]);

    console.log(`\n=== Whatsapp Accounts (Found: ${wa.length}) ===`);
    wa.forEach(a => console.log(`Name: ${a.verifiedName || a.displayPhoneNumber} | Org: ${a.organization} | Status: ${a.status}`));

    console.log(`\n=== Instagram Accounts (Found: ${ig.length}) ===`);
    ig.forEach(a => console.log(`Name: ${a.igUsername} | Org: ${a.organization} | Status: ${a.status}`));

    console.log(`\n=== Facebook Accounts (Found: ${fb.length}) ===`);
    fb.forEach(a => console.log(`Page: ${a.pageName} | Org: ${a.organization} | Status: ${a.status}`));

    console.log(`\n=== Telegram Accounts (Found: ${tg.length}) ===`);
    tg.forEach(a => console.log(`Name: ${a.botUsername} | Org: ${a.organization} | Status: ${a.status}`));

    console.log(`\n=== YouTube Accounts (Found: ${yt.length}) ===`);
    yt.forEach(a => console.log(`Title: ${a.title} | Org: ${a.organization}`));

  } catch (err) {
    console.error('Error running script:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected.');
  }
}

run();
