const express = require('express');
const Session = require('../models/Session');
const { createMeeting } = require('../services/zoomService');
const { finalizeSessionAttendance } = require('../services/attendanceService');
const router = express.Router();

// @desc    Schedule a new class session
// @route   POST /api/sessions/schedule
// @access  Private/Admin
router.post('/schedule', async (req, res) => {
  try {
    const { batchId, topic, duration, startTime } = req.body;
    
    // Call Zoom API to create meeting
    const zoomMeeting = await createMeeting(topic, duration);

    const session = new Session({
      batchId,
      zoomMeetingId: zoomMeeting.id,
      zoomJoinUrl: zoomMeeting.join_url,
      startTime,
      status: 'scheduled'
    });

    const createdSession = await session.save();
    res.status(201).json(createdSession);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Trigger AI Bot to join session
// @route   POST /api/sessions/:id/start-ai
// @access  Private/Admin
router.post('/:id/start-ai', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // TODO: Emit socket event or message to the separate zoom-bot service 
    // to launch Puppeteer and join the meeting `session.zoomJoinUrl`
    
    session.status = 'live';
    await session.save();

    res.json({ message: 'AI Teacher Bot has been dispatched to join the meeting.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    End session and generate summary/memory
// @route   POST /api/sessions/:id/end
// @access  Private/Admin
router.post('/:id/end', async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'completed';
    session.endTime = new Date();
    await session.save();

    // Finalize attendance and update student memories
    await finalizeSessionAttendance(session._id, session.batchId);

    // TODO: Trigger BullMQ worker to generate AI class summaries and notes 
    // from the raw transcript.

    res.json({ message: 'Session ended. Attendance and Memory updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
