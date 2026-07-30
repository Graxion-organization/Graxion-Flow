const { generateResponse } = require('../services/aiOrchestrator');
const { streamTextToSpeech } = require('../services/elevenLabsService');
const { logStudentJoin, logStudentQuestion, logStudentLeave } = require('../services/attendanceService');
const Material = require('../models/Material');
const logger = require('../utils/logger');


// Simple in-memory question queue for the session
const sessionQueues = {};

const initializeClassNamespace = (io) => {
  const classNs = io.of(/^\/class-[a-zA-Z0-9]+$/);

  classNs.on('connection', (socket) => {
    const namespaceName = socket.nsp.name;
    const sessionId = namespaceName.split('-')[1];

    if (!sessionQueues[sessionId]) {
      sessionQueues[sessionId] = { questions: [], activeQuestion: null };
    }

    logger.info(`Student ${socket.id} joined class session: ${sessionId}`);

    socket.on('join_class', ({ studentId, name }) => {
      socket.studentId = studentId;
      socket.studentName = name;
      logStudentJoin(sessionId, studentId);
      classNs.emit('system_message', `${name} has joined the class.`);
    });

    socket.on('ask_question', async ({ question, materialId }) => {
      logger.info(`Question from ${socket.studentName}: ${question}`);
      
      // 1. Queue Management (Simplistic Deduplication)
      const queue = sessionQueues[sessionId].questions;
      if (queue.find(q => q.question.toLowerCase() === question.toLowerCase())) {
        return socket.emit('system_message', 'This question is already in the queue.');
      }
      
      logStudentQuestion(sessionId, socket.studentId);
      queue.push({ socketId: socket.id, studentName: socket.studentName, question, materialId });
      classNs.emit('queue_update', queue.length);

      // 2. Process Question if AI is idle
      if (!sessionQueues[sessionId].activeQuestion) {
        processNextQuestion(classNs, sessionId);
      }
    });

    socket.on('raise_hand', () => {
      classNs.emit('hand_raised', { studentId: socket.studentId, name: socket.studentName });
    });

    socket.on('disconnect', () => {
      logger.info(`Student ${socket.id} left class session: ${sessionId}`);
      if (socket.studentId) {
        logStudentLeave(sessionId, socket.studentId);
      }
    });
  });
};

const processNextQuestion = async (classNs, sessionId) => {
  const session = sessionQueues[sessionId];
  if (session.questions.length === 0) {
    session.activeQuestion = null;
    return;
  }

  const nextQ = session.questions.shift();
  session.activeQuestion = nextQ;
  classNs.emit('queue_update', session.questions.length);
  
  // Broadcast that AI is thinking
  classNs.emit('ai_status', { status: 'thinking', processing: nextQ.question });

  // 3. Fetch Context (Mock fetching Material processed data)
  let contextData = {};
  try {
    const material = await Material.findById(nextQ.materialId);
    if (material && material.processedData) {
      contextData = material.processedData.expectedQuestions || [];
    }
  } catch (err) {
    logger.error('Error fetching context:', err);
  }

  // 4. Generate AI Response
  const aiAnswer = await generateResponse(nextQ.question, contextData);
  
  // Send text to chat immediately
  classNs.emit('ai_response', { toQuestion: nextQ.question, answer: aiAnswer });
  classNs.emit('ai_status', { status: 'speaking' });

  // 5. Generate and Stream TTS Audio
  streamTextToSpeech(aiAnswer, 
    (audioBuffer) => {
      // Send audio chunk to clients via socket
      classNs.emit('ai_audio_chunk', audioBuffer.toString('base64'));
    },
    (err) => {
      if (err) logger.error('TTS Error:', err);
      // Finished speaking, move to next question
      classNs.emit('ai_status', { status: 'idle' });
      processNextQuestion(classNs, sessionId);
    }
  );
};

module.exports = { initializeClassNamespace };
