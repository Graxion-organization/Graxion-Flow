const Meeting = require('../models/Meeting');
const { generatePresentationScript } = require('./aiService');
const { streamTextToSpeech } = require('./elevenLabsService');
const socketService = require('./socketService');
const KJUR = require('jsrsasign');

const startAutoScheduler = () => {
  console.log("Starting Meeting Auto-Scheduler...");
  
  // Check every 30 seconds
  setInterval(async () => {
    try {
      const now = new Date();
      // Find meetings that are scheduled to start within the next minute or have already passed start time but are still 'scheduled'
      const meetingsToStart = await Meeting.find({
        status: 'scheduled',
        scheduledStartTime: { $lte: now }
      }).populate('agent');

      for (const meeting of meetingsToStart) {
        console.log(`Auto-starting meeting: ${meeting.topic} (ID: ${meeting._id})`);
        
        // Mark as in progress immediately to avoid duplicate processing
        meeting.status = 'in_progress';
        await meeting.save();

        const agent = meeting.agent;
        if (!agent) {
          console.error("Agent not found for meeting:", meeting._id);
          continue;
        }

        let kbText = "Welcome to the presentation. ";
        if (agent.knowledgeBase && agent.knowledgeBase.length > 0) {
          kbText += `The agent has ${agent.knowledgeBase.length} files to discuss. `;
        } else {
          kbText += "I will be explaining our core business plan today.";
        }

        console.log(`Generating script for Agent: ${agent.name}...`);
        const script = await generatePresentationScript(agent.personaPrompt, kbText);
        
        const io = socketService.getIO();
        if (io) {
          console.log(`[Socket.io] Emitting 'spawn_bot' for Meeting: ${meeting.zoomMeetingId}`);
          
          const ZOOM_SDK_KEY = process.env.ZOOM_SDK_KEY;
          const ZOOM_SDK_SECRET = process.env.ZOOM_SDK_SECRET;
          let signaturePayload = null;

          if (ZOOM_SDK_KEY && ZOOM_SDK_SECRET) {
            const iat = Math.round((new Date().getTime() - 30000) / 1000);
            const exp = iat + 60 * 60 * 2;
            const oHeader = { alg: 'HS256', typ: 'JWT' };
            const oPayload = {
              sdkKey: ZOOM_SDK_KEY,
              mn: meeting.zoomMeetingId,
              role: 0,
              iat: iat,
              exp: exp,
              appKey: ZOOM_SDK_KEY,
              tokenExp: exp
            };
            signaturePayload = KJUR.jws.JWS.sign('HS256', JSON.stringify(oHeader), JSON.stringify(oPayload), ZOOM_SDK_SECRET);
          } else {
            console.warn("Zoom SDK keys missing. Bot will use public fallback link.");
          }

          io.emit('spawn_bot', { 
            sessionId: meeting._id,
            meetingId: meeting.zoomMeetingId,
            password: meeting.zoomPassword,
            zoomJoinUrl: meeting.zoomJoinUrl, // Fallback
            sdkKey: ZOOM_SDK_KEY,
            signature: signaturePayload
          });
        } else {
          console.error("Socket.io not initialized. Cannot spawn bot.");
        }
        
        console.log(`Starting ElevenLabs TTS stream for voice: ${agent.elevenLabsVoiceId}...`);
        streamTextToSpeech(script, (audioChunk) => {
          if (io) {
            io.of(`/class-${meeting._id}`).emit('ai_audio_chunk', audioChunk.toString('base64'));
          }
        }, () => {
          console.log(`Presentation audio stream completed for meeting: ${meeting._id}`);
          meeting.status = 'completed';
          meeting.save().catch(e => console.error(e));
        });
      }
    } catch (error) {
      console.error("Auto-scheduler error:", error);
    }
  }, 30000); // 30 seconds
};

module.exports = { startAutoScheduler };
