const logger = require('../utils/logger');
const { SarvamAIClient } = require('sarvamai');

/**
 * Generates an audio file from text using Sarvam AI's TTS.
 * @param {string} text - The text to convert to speech
 * @param {string} apiKey - Sarvam API Subscription Key
 * @returns {Promise<Buffer>} - MP3/WAV audio buffer
 */
const generateSarvamAudio = async (text, apiKey) => {
  if (!apiKey) {
    throw new Error('Sarvam API Key is missing.');
  }

  const client = new SarvamAIClient({
    apiSubscriptionKey: apiKey
  });

  try {
    // Sarvam usually supports up to ~500 chars per request, so truncate or chunk if needed.
    // For now, we'll truncate to 500 characters to be safe with their standard limits.
    const safeText = text.length > 500 ? text.substring(0, 500) : text;

    const response = await client.textToSpeech.convert({
        model: "bulbul:v3",
        text: safeText,
        target_language_code: "hi-IN",
        speaker: "shubh",
    });

    let base64Audio = null;
    if (response && response.audios && response.audios.length > 0) {
      base64Audio = response.audios[0];
    } else if (response && response.audio_base64) {
      base64Audio = response.audio_base64;
    } else if (typeof response === 'string') {
      // In case the SDK returns the base64 string directly
      base64Audio = response;
    }

    if (!base64Audio) {
      logger.error('[Sarvam TTS] Unexpected response format:', Object.keys(response || {}));
      throw new Error('Sarvam TTS returned an unexpected format.');
    }

    // Strip data URI prefix if present (e.g., "data:audio/wav;base64,")
    const base64Data = base64Audio.replace(/^data:audio\/\w+;base64,/, '');

    const audioBuffer = Buffer.from(base64Data, 'base64');
    logger.info(`[Sarvam TTS] Audio generated successfully: ${audioBuffer.length} bytes`);
    return audioBuffer;

  } catch (error) {
    logger.error('[Sarvam TTS] Request error:', error.message);
    throw error;
  }
};

module.exports = { generateSarvamAudio };
