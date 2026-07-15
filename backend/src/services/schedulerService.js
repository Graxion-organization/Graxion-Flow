const Meeting = require('../models/Meeting');
const logger = require('../utils/logger');

const AIService = require('./aiService');
const { streamTextToSpeech } = require('./elevenLabsService');
const { getIO } = require('../utils/socket');
const KJUR = require('jsrsasign');

const startAutoScheduler = () => {
  logger.info("Starting Meeting Auto-Scheduler...");
  
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
        logger.info(`Auto-starting meeting: ${meeting.topic} (ID: ${meeting._id})`);
        
        // Mark as in progress immediately to avoid duplicate processing
        meeting.status = 'in_progress';
        await meeting.save();

        const agent = meeting.agent;
        if (!agent) {
          logger.error("Agent not found for meeting:", meeting._id);
          continue;
        }

        let kbText = "Welcome to the presentation. ";
        if (agent.knowledgeBase && agent.knowledgeBase.length > 0) {
          kbText += `I have the following context to discuss:\n`;
          agent.knowledgeBase.forEach(kb => {
            if (kb.fileType === 'text' && kb.textData) {
              kbText += `\n[Context: ${kb.textData}]\n`;
            } else if (kb.fileUrl) {
              kbText += `\n[Reference File: ${kb.fileUrl}]\n`;
            }
          });
        } else {
          kbText += "I will be explaining our core business plan today.";
        }

        const io = getIO();
        if (io) {
          io.emit('bot_status', { meetingId: meeting._id, status: 'generating_script' });
        }

        logger.info(`Generating script for Agent: ${agent.name}...`);
        const script = await AIService.generatePresentationScript(agent.personaPrompt || agent.systemPrompt, kbText);
        
        if (io) {
          logger.info(`[Socket.io] Emitting 'spawn_bot' for Meeting: ${meeting.zoomMeetingId}`);
          
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
            logger.warn("Zoom SDK keys missing. Bot will use public fallback link.");
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
          logger.error("Socket.io not initialized. Cannot spawn bot.");
        }
        
        logger.info(`Starting ElevenLabs TTS stream for voice: ${agent.elevenLabsVoiceId}...`);
        if (io) {
          io.emit('bot_status', { meetingId: meeting._id, status: 'speaking' });
        }

        streamTextToSpeech(script, (audioChunk) => {
          if (io) {
            io.to(`class_${meeting._id}`).emit('ai_audio_chunk', audioChunk.toString('base64'));
          }
        }, () => {
          logger.info(`Presentation audio stream completed for meeting: ${meeting._id}`);
          if (io) {
            io.emit('bot_status', { meetingId: meeting._id, status: 'stopped' });
          }
          meeting.status = 'completed';
          meeting.save().catch(e => logger.error(e));
        });
      }
    } catch (error) {
      logger.error("Auto-scheduler error:", error);
    }
  }, 30000); // 30 seconds
};

module.exports = { startAutoScheduler };
