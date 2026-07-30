const express = require('express');
const logger = require('../utils/logger');

const path = require('path');
const fs = require('fs');
const Meeting = require('../models/Meeting');
const Agent = require('../models/Agent');
const { createMeeting } = require('../services/zoomService');
const AIService = require('../services/aiService');
const { generateAudioFile } = require('../services/elevenLabsService');
const { generateGoogleAudio } = require('../services/googleTtsService');
const { getIO } = require('../utils/socket');
const KJUR = require('jsrsasign');
const cloudinary = require('cloudinary').v2;
const router = express.Router();

const { protect } = require('../middleware/auth');
const { injectOrganization } = require('../middleware/organizationMiddleware');

// Ensure audio output directory exists
const AUDIO_DIR = path.join(__dirname, '../../public/audio');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// ─── Helper: Generate Zoom SDK JWT Signature ─────────────────────
const generateZoomSignature = (meetingNumber) => {
  const ZOOM_SDK_KEY = process.env.ZOOM_SDK_KEY;
  const ZOOM_SDK_SECRET = process.env.ZOOM_SDK_SECRET;

  if (!ZOOM_SDK_KEY || !ZOOM_SDK_SECRET) {
    return null;
  }

  const iat = Math.round((new Date().getTime() - 30000) / 1000);
  const exp = iat + 60 * 60 * 2; // Valid for 2 hours

  const oHeader = { alg: 'HS256', typ: 'JWT' };
  const oPayload = {
    sdkKey: ZOOM_SDK_KEY,
    mn: meetingNumber,
    role: 1, // 1 = host (bot joins as meeting host — same account that created the meeting)
    iat,
    exp,
    appKey: ZOOM_SDK_KEY,
    tokenExp: exp
  };

  const signature = KJUR.jws.JWS.sign(
    'HS256',
    JSON.stringify(oHeader),
    JSON.stringify(oPayload),
    ZOOM_SDK_SECRET
  );

  return { signature, sdkKey: ZOOM_SDK_KEY };
};

// ─── Helper: Build Knowledge Base text for Gemini ─────────────────
const buildKnowledgeBaseText = (agent) => {
  const kbEntries = agent.knowledgeBase || [];
  if (kbEntries.length === 0) {
    return 'No specific knowledge base provided. Present the agent\'s capabilities and purpose.';
  }

  const textParts = [];
  kbEntries.forEach((entry, index) => {
    if (entry.textData && entry.textData.trim()) {
      if (entry.fileType === 'text') {
        textParts.push(`[Section ${index + 1}: Text Content]\n${entry.textData.trim()}`);
      } else if (entry.fileType === 'pdf') {
        const fileName = entry.fileName || `Document ${index + 1}`;
        textParts.push(`[Section ${index + 1}: PDF Document - "${fileName}"]\n${entry.textData.trim()}`);
      }
    }
  });

  if (textParts.length === 0) {
    // No extractable text content yet
    return `The agent has ${kbEntries.length} knowledge base file(s) uploaded. Present the agent's core capabilities.`;
  }

  return textParts.join('\n\n---\n\n');
};

// ─── POST /api/meetings/upload-video ─────────────────────────────
// Upload a video to Cloudinary for use in Zoom presentations.
// Supports large files via chunked upload.
router.post('/upload-video', protect, injectOrganization, async (req, res) => {
  try {
    if (!req.files || !req.files.video) {
      return res.status(400).json({ message: 'No video file provided. Send as multipart/form-data with field name "video".' });
    }

    const videoFile = req.files.video;
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/mpeg'];
    if (!allowedTypes.includes(videoFile.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Please upload mp4, mov, webm, or avi.' });
    }

    logger.info(`[Video Upload] Uploading ${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(1)} MB) to Cloudinary...`);

    // Cloudinary config (same as cloudinaryService.js)
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Use upload_large for files > 100MB, regular upload for smaller
    const uploadFn = videoFile.size > 100 * 1024 * 1024
      ? cloudinary.uploader.upload_large
      : cloudinary.uploader.upload;

    const result = await uploadFn(videoFile.tempFilePath, {
      resource_type: 'video',
      folder: `zoom_presentations/${req.organization._id}`,
      chunk_size: 6 * 1024 * 1024, // 6MB chunks (for large files)
      timeout: 600000              // 10 minute timeout for large uploads
    });

    // Cleanup temp file
    try { fs.unlinkSync(videoFile.tempFilePath); } catch (e) {}

    logger.info(`[Video Upload] Success: ${result.secure_url} (duration: ${result.duration?.toFixed(0)}s)`);

    res.json({
      videoUrl: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,         // seconds
      width: result.width,
      height: result.height,
      format: result.format,
      sizeMb: (videoFile.size / 1024 / 1024).toFixed(1)
    });
  } catch (error) {
    logger.error('[Video Upload] Error:', error.message);
    res.status(500).json({ message: 'Video upload failed: ' + error.message });
  }
});

// ─── GET /api/meetings ─────────────────────────────────────────────
router.get('/', protect, injectOrganization, async (req, res) => {
  try {
    const meetings = await Meeting.find({ organization: req.organization._id })
      .populate('agent', 'name elevenLabsVoiceId knowledgeBase')
      .sort({ scheduledStartTime: -1 });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/meetings ──────────────────────────────────────────────
router.post('/', protect, injectOrganization, async (req, res) => {
  try {
    const { agentId, topic, scheduledStartTime, durationMinutes, videoUrl, presentationType } = req.body;

    const agent = await Agent.findOne({ _id: agentId, organization: req.organization._id });
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    const zoomMeeting = await createMeeting(topic, scheduledStartTime, durationMinutes);

    const meeting = new Meeting({
      agent: agentId,
      user: req.user._id,
      organization: req.organization._id,
      zoomMeetingId: zoomMeeting.id,
      zoomPassword: zoomMeeting.password,
      zoomJoinUrl: zoomMeeting.join_url,
      zoomStartUrl: zoomMeeting.start_url,
      topic,
      scheduledStartTime,
      durationMinutes,
      videoUrl: videoUrl || null,
      presentationType: presentationType || 'ai_voice'
    });

    const createdMeeting = await meeting.save();
    res.status(201).json(createdMeeting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─── PUT /api/meetings/:id ─────────────────────────────────────────
router.put('/:id', protect, injectOrganization, async (req, res) => {
  try {
    const { topic, scheduledStartTime, durationMinutes } = req.body;
    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, organization: req.organization._id },
      { $set: { topic, scheduledStartTime, durationMinutes } },
      { new: true, runValidators: true }
    );

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    res.json(meeting);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ─── DELETE /api/meetings/:id ──────────────────────────────────────
router.delete('/:id', protect, injectOrganization, async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndDelete({
      _id: req.params.id,
      organization: req.organization._id
    });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }
    // Clean up audio file if it exists
    if (meeting.audioUrl && meeting.audioUrl.startsWith('/audio/')) {
      const audioPath = path.join(__dirname, '../../public', meeting.audioUrl);
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
      }
    }
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET /api/meetings/:id/sdk-signature ─────────────────────────
// Returns a fresh Zoom SDK JWT signature for the frontend to join
router.get('/:id/sdk-signature', protect, injectOrganization, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      organization: req.organization._id
    });
    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const sigData = generateZoomSignature(meeting.zoomMeetingId);
    if (!sigData) {
      return res.status(500).json({
        message: 'Zoom SDK credentials (ZOOM_SDK_KEY / ZOOM_SDK_SECRET) are not configured on the server. Please add them to your .env file.'
      });
    }

    res.json({
      signature: sigData.signature,
      sdkKey: sigData.sdkKey,
      meetingNumber: meeting.zoomMeetingId,
      password: meeting.zoomPassword
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/meetings/:id/start ─────────────────────────────────
// Full orchestration: KB → Script → Audio File → SDK Signature
// Frontend receives all data needed to join Zoom AND play audio
router.post('/:id/start', protect, injectOrganization, async (req, res) => {
  const io = (() => { try { return getIO(); } catch { return null; } })();
  const emitStatus = (status, extra = {}) => {
    if (io) io.emit('bot_status', { meetingId: req.params.id, status, ...extra });
  };

  try {
    const meeting = await Meeting.findOne({
      _id: req.params.id,
      organization: req.organization._id
    }).populate({
      path: 'agent',
      select: 'name systemPrompt elevenLabsVoiceId knowledgeBase'
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // If meeting is already in_progress, we allow restarting it
    // in case the previous attempt failed or timed out.
    if (meeting.status === 'in_progress') {
      logger.info(`[Meeting ${meeting._id}] Restarting an already in-progress presentation.`);
    }

    const agent = meeting.agent;
    if (!agent) {
      return res.status(404).json({ message: 'Agent linked to this meeting was not found.' });
    }

    // ── VIDEO MODE: If this is a video presentation, skip TTS entirely ─
    if (meeting.presentationType === 'video') {
      if (!meeting.videoUrl) {
        return res.status(400).json({ message: 'Video presentation has no video URL. Please upload a video first.' });
      }
      logger.info(`[Meeting ${meeting._id}] VIDEO mode — skipping script/TTS, using uploaded video: ${meeting.videoUrl}`);
      meeting.status = 'in_progress';
      await meeting.save();
      emitStatus('joining');

      const sigData = generateZoomSignature(meeting.zoomMeetingId);
      return res.json({
        message: 'Video presentation starting',
        meeting: {
          _id: meeting._id,
          topic: meeting.topic,
          status: meeting.status,
          zoomMeetingId: meeting.zoomMeetingId,
          zoomPassword: meeting.zoomPassword,
          zoomJoinUrl: meeting.zoomJoinUrl,
          audioUrl: null,
          videoUrl: meeting.videoUrl,
          presentationType: 'video'
        },
        sdkData: sigData ? {
          signature: sigData.signature,
          sdkKey: sigData.sdkKey,
          meetingNumber: meeting.zoomMeetingId,
          password: meeting.zoomPassword,
          userName: agent.name || 'AI Presenter',
          userEmail: ''
        } : null,
        script: null
      });
    }

    // ── Step 1: Gather Knowledge Base content ──────────────────
    emitStatus('generating_script');
    const kbText = buildKnowledgeBaseText(agent);
    logger.info(`[Meeting ${meeting._id}] KB text built: ${kbText.length} characters`);

    // ── Step 2: Generate Presentation Script via Gemini ────────
    logger.info(`[Meeting ${meeting._id}] Generating script for agent: ${agent.name}...`);
    let script;
    try {
      script = await AIService.generatePresentationScript(
        agent.systemPrompt || 'You are a professional presenter.',
        kbText
      );
      logger.info(`[Meeting ${meeting._id}] Script generated: ${script.length} chars`);
    } catch (scriptErr) {
      logger.error(`[Meeting ${meeting._id}] Script generation failed:`, scriptErr.message);
      script = `Hello everyone! I am ${agent.name}, your AI presenter. Today I will be presenting an overview of our key topics. Thank you for joining this session.`;
    }

    // ── Step 3: Generate Audio File via ElevenLabs ─────────────
    emitStatus('generating_audio');
    logger.info(`[Meeting ${meeting._id}] Generating audio with voice: ${agent.elevenLabsVoiceId || 'default'}...`);

    let audioUrl = null;
    try {
      let audioBuffer;
      try {
        audioBuffer = await generateAudioFile(script, agent.elevenLabsVoiceId || null);
      } catch (elevenErr) {
        logger.error(`[Meeting ${meeting._id}] ElevenLabs failed: ${elevenErr.message}. Trying Google TTS fallback...`);
        const googleKey = process.env.GOOGLE_TTS_API_KEY || process.env.GEMINI_API_KEY; 
        try {
          audioBuffer = await generateGoogleAudio(script, googleKey);
        } catch (googleErr) {
          logger.error(`[Meeting ${meeting._id}] Google TTS failed: ${googleErr.message}. Trying Sarvam AI TTS fallback...`);
          // Sarvam TTS Fallback
          if (process.env.SARVAM_API_KEY) {
            try {
              const { generateSarvamAudio } = require('../services/sarvamTtsService');
              audioBuffer = await generateSarvamAudio(script, process.env.SARVAM_API_KEY);
            } catch (sarvamErr) {
               logger.error(`[Meeting ${meeting._id}] Sarvam TTS failed: ${sarvamErr.message}. Trying OpenAI TTS fallback...`);
               // OpenAI TTS Fallback
               if (process.env.OPENAI_API_KEY) {
                 try {
                   const { generateOpenAIAudio } = require('../services/openaiTtsService');
                   audioBuffer = await generateOpenAIAudio(script, process.env.OPENAI_API_KEY);
                 } catch (openaiErr) {
                    throw new Error(`All voice fallbacks failed (ElevenLabs, Google, Sarvam, OpenAI). Last error: ${openaiErr.message}`);
                 }
               } else {
                 throw new Error(`All voice fallbacks failed (ElevenLabs, Google, Sarvam). No OPENAI_API_KEY provided for further fallback. Last error: ${sarvamErr.message}`);
               }
            }
          } else {
             logger.warn(`[Meeting ${meeting._id}] No SARVAM_API_KEY found. Trying OpenAI TTS fallback...`);
             // OpenAI TTS Fallback
             if (process.env.OPENAI_API_KEY) {
               try {
                 const { generateOpenAIAudio } = require('../services/openaiTtsService');
                 audioBuffer = await generateOpenAIAudio(script, process.env.OPENAI_API_KEY);
               } catch (openaiErr) {
                  throw new Error(`All voice fallbacks failed (ElevenLabs, Google, OpenAI). Last error: ${openaiErr.message}`);
               }
             } else {
               throw new Error(`All voice fallbacks failed (ElevenLabs, Google). No SARVAM_API_KEY or OPENAI_API_KEY provided for further fallback. Last error: ${googleErr.message}`);
             }
          }
        }
      }
      
      const audioFileName = `meeting-${meeting._id}-${Date.now()}.mp3`;
      const audioFilePath = path.join(AUDIO_DIR, audioFileName);

      fs.writeFileSync(audioFilePath, audioBuffer);
      audioUrl = `/audio/${audioFileName}`;
      logger.info(`[Meeting ${meeting._id}] Audio file saved: ${audioFilePath}`);
    } catch (audioErr) {
      logger.error(`[Meeting ${meeting._id}] All audio generation failed:`, audioErr.message);
      // REJECT meeting start if audio generation completely fails
      meeting.status = 'failed';
      await meeting.save();
      return res.status(500).json({ message: 'Voice generation failed: ' + audioErr.message });
    }

    // ── Step 4: Generate Zoom SDK Signature ────────────────────
    const sigData = generateZoomSignature(meeting.zoomMeetingId);
    if (!sigData) {
      logger.warn(`[Meeting ${meeting._id}] Zoom SDK keys not configured. Bot cannot join meeting.`);
    }

    // ── Step 5: Update meeting status and save audio URL ───────
    meeting.status = 'in_progress';
    if (audioUrl) meeting.audioUrl = audioUrl;
    await meeting.save();

    emitStatus('joining');

    // ── Step 6: Return everything the frontend needs ────────────
    return res.json({
      message: 'Presentation started successfully',
      meeting: {
        _id: meeting._id,
        topic: meeting.topic,
        status: meeting.status,
        zoomMeetingId: meeting.zoomMeetingId,
        zoomPassword: meeting.zoomPassword,
        zoomJoinUrl: meeting.zoomJoinUrl,
        audioUrl,           // For AI voice mode
        videoUrl: meeting.videoUrl || null,   // For video mode
        presentationType: meeting.presentationType || 'ai_voice'
      },
      sdkData: sigData ? {
        signature: sigData.signature,
        sdkKey: sigData.sdkKey,
        meetingNumber: meeting.zoomMeetingId,
        password: meeting.zoomPassword,
        userName: agent.name || 'AI Presenter',
        userEmail: ''
      } : null,
      script: script.substring(0, 200) + '...' // Preview only
    });

  } catch (error) {
    logger.error(`[Meeting ${req.params.id}] Start failed:`, error);
    emitStatus('error', { message: error.message });
    res.status(500).json({ message: error.message });
  }
});

// ─── POST /api/meetings/:id/complete ──────────────────────────────
// Called by frontend when the presentation audio finishes playing
router.post('/:id/complete', protect, injectOrganization, async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, organization: req.organization._id },
      { status: 'completed' },
      { new: true }
    );
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

    const io = (() => { try { return getIO(); } catch { return null; } })();
    if (io) io.emit('bot_status', { meetingId: req.params.id, status: 'completed' });

    res.json({ message: 'Meeting marked as completed', meeting });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
