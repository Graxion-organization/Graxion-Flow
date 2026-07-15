const ClassSummary = require('../models/ClassSummary');
const logger = require('../utils/logger');

const StudentMemory = require('../models/StudentMemory');

const activeSessions = {}; // Stores live join/leave events

const logStudentJoin = (sessionId, studentId) => {
  if (!activeSessions[sessionId]) activeSessions[sessionId] = {};
  if (!activeSessions[sessionId][studentId]) {
    activeSessions[sessionId][studentId] = {
      joinTime: new Date(),
      leaveTime: null,
      questionsAsked: 0
    };
  }
};

const logStudentQuestion = (sessionId, studentId) => {
  if (activeSessions[sessionId] && activeSessions[sessionId][studentId]) {
    activeSessions[sessionId][studentId].questionsAsked += 1;
  }
};

const logStudentLeave = (sessionId, studentId) => {
  if (activeSessions[sessionId] && activeSessions[sessionId][studentId]) {
    activeSessions[sessionId][studentId].leaveTime = new Date();
  }
};

/**
 * Called when a session ends to aggregate attendance and update student memory
 */
const finalizeSessionAttendance = async (sessionId, batchId) => {
  const sessionData = activeSessions[sessionId];
  if (!sessionData) return;

  const attendanceRecords = [];

  for (const [studentId, data] of Object.entries(sessionData)) {
    const leaveTime = data.leaveTime || new Date();
    const durationMinutes = Math.round((leaveTime - data.joinTime) / 60000);

    attendanceRecords.push({
      studentId,
      joinTime: data.joinTime,
      leaveTime,
      durationMinutes,
      questionsAsked: data.questionsAsked
    });

    // Update Student Memory
    try {
      let memory = await StudentMemory.findOne({ studentId });
      if (!memory) {
        memory = new StudentMemory({ studentId });
      }
      
      memory.attendanceCount += 1;
      memory.totalSessionTimeMinutes += durationMinutes;
      memory.questionsAskedCount += data.questionsAsked;
      
      // A simplistic engagement score adjustment
      if (data.questionsAsked > 0) memory.engagementScore = Math.min(100, memory.engagementScore + 2);
      
      await memory.save();
    } catch (err) {
      logger.error(`Error updating memory for student ${studentId}:`, err.message);
    }
  }

  // Save to Class Summary
  try {
    await ClassSummary.findOneAndUpdate(
      { sessionId },
      { 
        sessionId,
        batchId,
        attendanceRecords
      },
      { upsert: true }
    );
    logger.info(`Session ${sessionId} attendance finalized and saved.`);
  } catch (err) {
    logger.error('Error saving ClassSummary:', err.message);
  }

  // Cleanup memory
  delete activeSessions[sessionId];
};

module.exports = {
  logStudentJoin,
  logStudentQuestion,
  logStudentLeave,
  finalizeSessionAttendance
};
