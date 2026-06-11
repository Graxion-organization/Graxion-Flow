const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'ai-teacher-materials',
    allowed_formats: ['pdf', 'txt'],
    resource_type: 'raw' // Required for non-image files like PDFs in some setups, or use 'auto'
  },
});

const upload = multer({ storage: storage });

module.exports = { cloudinary, upload };
