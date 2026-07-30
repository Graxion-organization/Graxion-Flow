const express = require('express');
const logger = require('../utils/logger');

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const Material = require('../models/Material');
const { pdfQueue } = require('../workers/pdfQueue');

const router = express.Router();

let upload;

// Check if Cloudinary is configured, otherwise fallback to local memory storage for the MVP
if (process.env.CLOUDINARY_CLOUD_NAME) {
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'ai-teacher/materials',
      allowed_formats: ['pdf'],
    },
  });
  upload = multer({ storage });
} else {
  // Safe local fallback so the user doesn't crash when testing locally
  const fs = require('fs');
  if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  });
  upload = multer({ storage });
}

// @desc    Upload a new material (PDF/Note)
// @route   POST /api/materials/upload
// @access  Private/Admin
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { courseId, type } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const newMaterial = new Material({
      courseId,
      type: type || 'PDF',
      url: req.file.path,
      cloudinaryId: req.file.filename,
      status: 'pending'
    });

    await newMaterial.save();

    // Add to BullMQ queue for PDF processing or process locally
    if (process.env.USE_REDIS === 'true') {
      await pdfQueue.add('process-pdf', {
        materialId: newMaterial._id,
        url: newMaterial.url
      });
    } else {
      // Process it right now so the user can see it work locally
      const { processPdf } = require('../workers/pdfWorker');
      processPdf({ data: { materialId: newMaterial._id, url: newMaterial.url } })
        .catch(err => logger.error('Local Processing Error:', err));
    }

    res.status(201).json({
      message: 'File uploaded successfully and queued for processing',
      material: newMaterial
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @desc    Get material status
// @route   GET /api/materials/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }
    res.json(material);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
