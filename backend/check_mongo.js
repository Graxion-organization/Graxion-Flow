const { MongoClient } = require('mongodb');

async function run() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db('graxion-flow');
    const templates = database.collection('templates');
    
    const allTemplates = await templates.find({}).toArray();
    console.log(JSON.stringify(allTemplates, null, 2));
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
