const express = require('express');
const Meeting = require('../models/Meeting');
const Agent = require('../models/Agent');
const { createMeeting } = require('../services/zoomService');
const { generatePresentationScript } = require('../services/aiService');
const { streamTextToSpeech } = require('../services/elevenLabsService');
const socketService = require('../services/socketService');
const KJUR = require('jsrsasign');
const router = express.Router();

// Mock Auth Middleware
const protect = (req, res, next) => {
  req.user = { _id: "60d0fe4f5311236168a109ca" };
  next();
};

// @desc    Get all meetings for logged-in user
// @route   GET /api/meetings
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const meetings = await Meeting.find({ owner: req.user._id }).populate('agent', 'name');
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Schedule a new meeting (Zoom integration placeholder)
// @route   POST /api/meetings
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { agentId, topic, scheduledStartTime, durationMinutes } = req.body;
    
    // Verify agent exists
    const agent = await Agent.findOne({ _id: agentId, owner: req.user._id });
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Call Zoom Service
    const zoomMeeting = await createMeeting(topic, scheduledStartTime, durationMinutes);

    const meeting = new Meeting({
      agent: agentId,
      owner: req.user._id,
      zoomMeetingId: zoomMeeting.id,
      zoomPassword: zoomMeeting.password,
      zoomJoinUrl: zoomMeeting.join_url,
      zoomStartUrl: zoomMeeting.start_url,
      topic,
      scheduledStartTime,
      durationMinutes
    });

    const createdMeeting = await meeting.save();
    res.status(201).json(createdMeeting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Delete a meeting
// @route   DELETE /api/meetings/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    // Optionally delete from Zoom API here if needed
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Generate Zoom Web SDK Signature
// @route   GET /api/meetings/:id/sdk-signature
// @access  Private
router.get('/:id/sdk-signature', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, owner: req.user._id });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const ZOOM_SDK_KEY = process.env.ZOOM_SDK_KEY;
    const ZOOM_SDK_SECRET = process.env.ZOOM_SDK_SECRET;
    
    if (!ZOOM_SDK_KEY || !ZOOM_SDK_SECRET) {
      return res.status(500).json({ message: 'Zoom SDK keys not configured on server' });
    }

    const iat = Math.round((new Date().getTime() - 30000) / 1000);
    const exp = iat + 60 * 60 * 2; // Valid for 2 hours

    const oHeader = { alg: 'HS256', typ: 'JWT' };
    const oPayload = {
      sdkKey: ZOOM_SDK_KEY,
      mn: meeting.zoomMeetingId,
      role: 0, // 0 for participant
      iat: iat,
      exp: exp,
      appKey: ZOOM_SDK_KEY,
      tokenExp: exp
    };

    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    const signature = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, ZOOM_SDK_SECRET);

    res.json({
      signature: signature,
      meetingNumber: meeting.zoomMeetingId,
      password: meeting.zoomPassword,
      sdkKey: ZOOM_SDK_KEY
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Start a presentation (Orchestrates LLM, ElevenLabs, and Zoom Bot)
// @route   POST /api/meetings/:id/start
// @access  Private
router.post('/:id/start', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, owner: req.user._id }).populate('agent');
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const agent = meeting.agent;
    
    // 1. Extract text from Knowledge Base (Simplified: assuming text is stored or we use a fallback)
    let kbText = "Welcome to the presentation. ";
    if (agent.knowledgeBase && agent.knowledgeBase.length > 0) {
      // In a real app, you would read the PDF file here. 
      // For MVP, we will pass a placeholder indicating the files.
      kbText += `The agent has ${agent.knowledgeBase.length} files to discuss: ` + agent.knowledgeBase.map(f => f.fileUrl).join(', ');
    } else {
      kbText += "I will be explaining our core business plan today.";
    }

    // 2. Generate Script using Gemini
    console.log(`Generating script for Agent: ${agent.name}...`);
    const script = await generatePresentationScript(agent.personaPrompt, kbText);
    console.log(`Script generated (${script.length} chars).`);

    // 3. Trigger Zoom Bot via Global Socket
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
    
    meeting.status = 'in_progress';
    await meeting.save();

    // 4. Stream Audio via ElevenLabs
    console.log(`Starting ElevenLabs TTS stream for voice: ${agent.elevenLabsVoiceId}...`);
    streamTextToSpeech(script, (audioChunk) => {
      if (io) {
        io.of(`/class-${meeting._id}`).emit('ai_audio_chunk', audioChunk.toString('base64'));
      }
    }, () => {
      console.log('Presentation audio stream completed.');
    });

    res.json({ message: 'Presentation started successfully', meeting });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
