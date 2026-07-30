const fs = require('fs');
const path = require('path');

const promptController = `const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
// Mocking Prompt Model - assuming simple key value pairs for now or saving to Org
const Organization = require('../models/Organization');

exports.getPrompts = catchAsync(async (req, res, next) => {
  const org = await Organization.findById(req.organization._id).select('prompts');
  res.status(200).json({ status: 'success', data: { prompts: org.prompts || [] } });
});

exports.savePrompt = catchAsync(async (req, res, next) => {
  const { name, content } = req.body;
  const org = await Organization.findById(req.organization._id);
  
  if (!org.prompts) org.prompts = [];
  
  const existingIndex = org.prompts.findIndex(p => p.name === name);
  if (existingIndex > -1) {
    org.prompts[existingIndex].content = content;
  } else {
    org.prompts.push({ name, content });
  }
  
  await org.save();
  res.status(200).json({ status: 'success', data: { prompts: org.prompts } });
});
`;

fs.writeFileSync(path.join(__dirname, 'src', 'controllers', 'promptController.js'), promptController);

const promptRoutes = `const express = require('express');
const promptController = require('../controllers/promptController');
const { protect } = require('../middleware/auth');
const { injectOrganization } = require('../middleware/organizationMiddleware');

const router = express.Router();

router.use(protect);
router.use(injectOrganization);

router.route('/')
  .get(promptController.getPrompts)
  .post(promptController.savePrompt);

module.exports = router;
`;

fs.writeFileSync(path.join(__dirname, 'src', 'routes', 'prompts.js'), promptRoutes);

const pdfWorker = `const { Worker } = require('bullmq');
const { connection } = require('./pdfQueue');
const Material = require('../models/Material');
const logger = require('../utils/logger');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const fs = require('fs');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const processPdf = async (job) => {
  const { materialId, url } = job.data;
  logger.info(\`Processing PDF for Material: \${materialId}\`);
  
  try {
    await Material.findByIdAndUpdate(materialId, { status: 'processing' });

    let pdfBuffer;
    if (url.startsWith('http')) {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      pdfBuffer = Buffer.from(response.data);
    } else {
      pdfBuffer = fs.readFileSync(url);
    }

    const data = await pdfParse(pdfBuffer);
    const rawText = data.text;

    // WA-014: Actual Gemini JSON Extraction
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'MOCK_KEY');
    
    // We use gemini-1.5-flash for faster parsing
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            summary: { type: SchemaType.STRING },
            chapters: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: { type: SchemaType.STRING },
                  startPage: { type: SchemaType.NUMBER }
                }
              }
            },
            lessonPlan: { type: SchemaType.STRING },
            expectedQuestions: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  q: { type: SchemaType.STRING },
                  a: { type: SchemaType.STRING }
                }
              }
            }
          }
        }
      }
    });

    logger.info(\`Sending \${rawText.length} characters to Gemini for structued RAG extraction\`);
    
    let processedData;
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_google_ai_studio_api_key_here') {
      logger.warn('GEMINI_API_KEY not provided. Returning mock data.');
      processedData = {
        summary: "Mock summary due to missing API key.",
        chapters: [{ title: "Introduction", startPage: 1 }],
        lessonPlan: "Mock lesson plan.",
        expectedQuestions: [{ q: "What?", a: "Mock" }]
      };
    } else {
      const prompt = \`Parse the following document text and extract the summary, chapters, a lesson plan, and expected Q&A pairs:\\n\\n\${rawText.substring(0, 100000)}\`;
      const result = await model.generateContent(prompt);
      processedData = JSON.parse(result.response.text());
    }

    processedData.rawTextPreview = rawText.substring(0, 500);

    await Material.findByIdAndUpdate(materialId, {
      status: 'completed',
      processedData: processedData
    });

    logger.info(\`Successfully processed Material: \${materialId}\`);
    return processedData;
  } catch (error) {
    logger.error(\`Failed to process material \${materialId}:\`, error);
    await Material.findByIdAndUpdate(materialId, { status: 'failed' });
    throw error;
  }
};

const pdfWorker = new Worker('pdf-processing', processPdf, {
  connection,
  concurrency: 2
});

pdfWorker.on('failed', (job, err) => {
  logger.error(\`[BullMQ] Job \${job.id} failed: \${err.message}\`);
});

module.exports = pdfWorker;
`;

fs.writeFileSync(path.join(__dirname, 'src', 'workers', 'pdfWorker.js'), pdfWorker);

// Update Organization Model for Prompts
let orgModel = fs.readFileSync(path.join(__dirname, 'src', 'models', 'Organization.js'), 'utf8');
if (!orgModel.includes('prompts: [')) {
  orgModel = orgModel.replace('}, { timestamps: true });', 
  \`  prompts: [{
    name: String,
    content: String
  }]
}, { timestamps: true });\`);
  fs.writeFileSync(path.join(__dirname, 'src', 'models', 'Organization.js'), orgModel);
}

let serverCode = fs.readFileSync(path.join(__dirname, 'src', 'server.js'), 'utf8');
if (!serverCode.includes('/api/prompts')) {
  serverCode = serverCode.replace(
    /app\.use\('\/api\/flows', require\('\.\/routes\/flows'\)\);/,
    "app.use('/api/flows', require('./routes/flows'));\napp.use('/api/prompts', require('./routes/prompts'));"
  );
  fs.writeFileSync(path.join(__dirname, 'src', 'server.js'), serverCode);
}
console.log('Group 2 completed');
