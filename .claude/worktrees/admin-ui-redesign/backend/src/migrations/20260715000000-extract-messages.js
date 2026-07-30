const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Conversation = require('./src/models/Conversation');
const Message = require('./src/models/Message');

dotenv.config();

async function migrateMessages() {
  console.log('Starting messages extraction migration...');
  
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all conversations that still have a 'messages' array
    const conversations = await Conversation.find({ 
      $or: [
        { messages: { $exists: true, $not: { $size: 0 } } },
        { messageCount: { $exists: false } }
      ]
    });

    console.log(`Found ${conversations.length} conversations to migrate`);

    let totalMigrated = 0;

    for (const conv of conversations) {
      if (conv.messages && conv.messages.length > 0) {
        // Map embedded messages to new Message objects
        const messagesToInsert = conv.messages.map(m => ({
          conversationId: conv._id,
          role: m.role,
          content: m.content,
          waMessageId: m.waMessageId,
          type: m.type,
          status: m.status,
          tokens: m.tokens,
          responseTime: m.responseTime,
          timestamp: m.timestamp,
          media: m.media,
        }));

        // Insert messages in bulk
        await Message.insertMany(messagesToInsert);
        totalMigrated += messagesToInsert.length;
        
        // Update the conversation's message count
        conv.messageCount = messagesToInsert.length;
      } else {
        conv.messageCount = 0;
      }

      // We don't unset the array just yet to be safe, or we can just empty it.
      // The schema will soon be updated to not even read 'messages', but we'll clear it from the DB to save space.
      conv.messages = undefined;
      await conv.save();
    }

    // Now remove 'messages' field from all conversations permanently
    await Conversation.updateMany(
      {},
      { $unset: { messages: 1 } }
    );

    console.log(`✅ Successfully extracted ${totalMigrated} messages into the new Message collection.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateMessages();
