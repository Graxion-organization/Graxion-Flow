const { Worker } = require('bullmq');
const { connection } = require('./pdfQueue');
const Material = require('../models/Material');
const logger = require('../utils/logger');

const pdfParse = require('pdf-parse');
const axios = require('axios');

const processPdf = async (job) => {
  const { materialId, url } = job.data;
  logger.info(`Processing PDF for Material: ${materialId}`);
  
  try {
    await Material.findByIdAndUpdate(materialId, { status: 'processing' });

    let pdfBuffer;
    if (url.startsWith('http')) {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      pdfBuffer = Buffer.from(response.data);
    } else {
      const fs = require('fs');
      pdfBuffer = fs.readFileSync(url);
    }

    // Parse the PDF
    const data = await pdfParse(pdfBuffer);
    const rawText = data.text;

    // TODO: In a real implementation, send `rawText` to LLM (Gemini) to generate structured JSON:
    // 1. Chapter/Page Maps
    // 2. Summaries & Lesson Plans
    // 3. Expected Q&A
    
    // For now, we simulate the LLM extraction
    const mockStructuredData = {
      summary: "This is a simulated AI extraction summary of the PDF.",
      chapters: [
        { title: "Introduction", startPage: 1 },
      ],
      lessonPlan: "1. Introduce concept. 2. Give examples.",
      expectedQuestions: [
        { q: "What is this about?", a: "It is an introduction." }
      ],
      rawTextPreview: rawText.substring(0, 500)
    };

    // Save structured data to Material
    await Material.findByIdAndUpdate(materialId, {
      status: 'completed',
      processedData: mockStructuredData
    });

    logger.info(`Successfully processed Material: ${materialId}`);
    return mockStructuredData;
  } catch (error) {
    logger.error(`Failed to process material ${materialId}:`, error);
    await Material.findByIdAndUpdate(materialId, { status: 'failed' });
    throw error;
  }
};

const useRedis = process.env.USE_REDIS === 'true';

let pdfWorker = null;

if (useRedis) {
  pdfWorker = new Worker('pdf-processing', processPdf, { connection });

  pdfWorker.on('completed', job => {
    logger.info(`Job ${job.id} has completed!`);
  });

  pdfWorker.on('failed', (job, err) => {
    logger.info(`Job ${job.id} has failed with ${err.message}`);
  });
} else {
  logger.info('⚠️  Redis is disabled. Set USE_REDIS=true in .env to enable background PDF workers.');
}

module.exports = { pdfWorker, processPdf };
