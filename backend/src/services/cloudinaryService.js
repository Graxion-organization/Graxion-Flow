const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryService {
  /**
   * Upload a file to Cloudinary
   * @param {string} fileContent - Base64 string or file path
   * @param {Object} options - Cloudinary upload options
   */
  static async upload(fileContent, options = {}) {
    try {
      const defaultOptions = {
        resource_type: 'auto', // Automatically detect if it's image or video
        folder: 'social_hub',
      };

      const result = await cloudinary.uploader.upload(fileContent, { ...defaultOptions, ...options });
      return {
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
      };
    } catch (error) {
      logger.error(`Cloudinary upload error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a file from Cloudinary
   */
  static async delete(publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      logger.error(`Cloudinary delete error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transformation config based on preset
   */
  static getTransformationConfig(preset, isVideo) {
    // Media Validation & Codecs
    const base = isVideo
      ? { fetch_format: 'mp4', video_codec: 'h264', audio_codec: 'aac' }
      : { fetch_format: 'jpg' };

    let presetTransform = {};
    switch (preset) {
      case 'feed_square':
        presetTransform = { width: 1080, height: 1080, crop: 'pad', background: 'black' };
        break;
      case 'feed_portrait':
        presetTransform = { width: 1080, height: 1350, crop: 'pad', background: 'black' };
        break;
      case 'reel_916':
      case 'story_916':
        presetTransform = { width: 1080, height: 1920, crop: 'pad', background: 'black' };
        break;
      default:
        break;
    }
    return { ...base, ...presetTransform };
  }

  /**
   * Generates a cached Cloudinary URL with applied transformations
   * Never transforms twice (uses CDN cache via structured URLs).
   */
  static transformMediaUrl(url, preset = 'feed_portrait') {
    if (!url) return null;

    // Fast fail if already transformed by this layer
    if (url.includes('c_pad') || url.includes('w_1080')) {
      return { url, thumbnailUrl: null };
    }

    const isVideo = /\.(mp4|mov|avi|wmv|m4v|webm|flv|3gp|mkv)(?:\?|$)/i.test(url) || url.includes('/video/');
    const rType = isVideo ? 'video' : 'image';

    let publicId = url;
    let type = 'fetch';

    // Intelligent public ID extraction for existing Cloudinary assets
    if (url.includes('res.cloudinary.com')) {
      try {
        const parts = url.split('/upload/');
        if (parts.length === 2) {
          const postUpload = parts[1].split('/');
          const hasVersion = /^v\d+$/.test(postUpload[0]);
          const pathParts = hasVersion ? postUpload.slice(1) : postUpload;
          const fileWithExt = pathParts.join('/');
          publicId = fileWithExt.substring(0, fileWithExt.lastIndexOf('.')) || fileWithExt;
          type = 'upload';
        }
      } catch (e) {
        // Fallback to fetch
      }
    }

    const transformation = this.getTransformationConfig(preset, isVideo);

    const transformedUrl = cloudinary.url(publicId, {
      resource_type: rType,
      type: type,
      transformation: [transformation],
      secure: true,
      sign_url: true
    });

    let thumbnailUrl = null;
    if (isVideo) {
      // Generate guaranteed JPEG thumbnail matching exact video boundaries
      thumbnailUrl = cloudinary.url(publicId, {
        resource_type: 'video',
        type: type,
        format: 'jpg',
        transformation: [{ 
          width: transformation.width, 
          height: transformation.height, 
          crop: transformation.crop, 
          background: transformation.background 
        }],
        secure: true
      });
    }

    return {
      url: transformedUrl,
      thumbnailUrl
    };
  }
}

module.exports = CloudinaryService;
