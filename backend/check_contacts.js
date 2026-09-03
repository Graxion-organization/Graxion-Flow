const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/graxion-flow').then(async () => {
  const contacts = await mongoose.connection.collection('contacts').find().toArray();
  console.log('Total contacts:', contacts.length);
  const optedIn = contacts.filter(c => c.optIn === true);
  console.log('Opted-in contacts:', optedIn.length);
  console.log('First 2 contacts:', contacts.slice(0,2).map(c => ({ phone: c.phone, optIn: c.optIn })));
  process.exit(0);
}).catch(console.error);
