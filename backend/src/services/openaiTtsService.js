const https = require('https');
const logger = require('../utils/logger');


/**
 * Generates an audio file from text using OpenAI's TTS REST API.
 * @param {string} text - The text to convert to speech
 * @param {string} apiKey - OpenAI API Key
 * @returns {Promise<Buffer>} - MP3 audio buffer
 */
const generateOpenAIAudio = (text, apiKey) => {
  return new Promise((resolve, reject) => {
    if (!apiKey) {
      return reject(new Error('OpenAI API Key is missing.'));
    }

    // OpenAI TTS has a limit of 4096 characters per request.
    const safeText = text.length > 4000 ? text.substring(0, 4000) : text;

    const body = JSON.stringify({
      model: 'tts-1',
      input: safeText,
      voice: 'alloy', // available voices: alloy, echo, fable, onyx, nova, shimmer
      response_format: 'mp3'
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/audio/speech',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', (chunk) => errBody += chunk);
        res.on('end', () => {
          reject(new Error(`OpenAI TTS API error ${res.statusCode}: ${errBody}`));
        });
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const audioBuffer = Buffer.concat(chunks);
        logger.info(`[OpenAI TTS] Audio generated successfully: ${audioBuffer.length} bytes`);
        resolve(audioBuffer);
      });
    });

    req.on('error', (err) => {
      logger.error('[OpenAI TTS] Request error:', err.message);
      reject(err);
    });

    req.write(body);
    req.end();
  });
};

module.exports = { generateOpenAIAudio };
