const https = require('https');
const logger = require('../utils/logger');


/**
 * Generates a complete audio file from text using Google Cloud TTS REST API.
 * Returns a Buffer containing the MP3 audio data.
 * @param {string} text - The text to convert to speech
 * @param {string} apiKey - Google Cloud API Key with Text-to-Speech API enabled
 * @returns {Promise<Buffer>} - MP3 audio buffer
 */
const generateGoogleAudio = (text, apiKey) => {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      return reject(new Error('Google TTS API Key is missing.'));
    }

    // Google TTS has a ~5000 byte limit per request. 
    // Truncate text just in case to avoid hard crashes, though 400 words is usually ~2500 chars.
    const safeText = text.length > 4900 ? text.substring(0, 4900) : text;

    const body = JSON.stringify({
      input: { text: safeText },
      voice: { languageCode: 'en-US', name: 'en-US-Journey-F' }, // Using a high quality Journey voice
      audioConfig: { audioEncoding: 'MP3' }
    });

    const options = {
      hostname: 'texttospeech.googleapis.com',
      path: `/v1/text:synthesize?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Google TTS API error ${res.statusCode}: ${responseBody}`));
        }

        try {
          const json = JSON.parse(responseBody);
          if (json.audioContent) {
            const audioBuffer = Buffer.from(json.audioContent, 'base64');
            logger.info(`[Google TTS] Audio generated successfully: ${audioBuffer.length} bytes`);
            resolve(audioBuffer);
          } else {
            reject(new Error('Google TTS returned no audio content.'));
          }
        } catch (e) {
          reject(new Error('Failed to parse Google TTS response: ' + e.message));
        }
      });
    });

    req.on('error', (err) => {
      logger.error('[Google TTS] Request error:', err.message);
      reject(err);
    });

    req.write(body);
    req.end();
  });
};

module.exports = { generateGoogleAudio };
