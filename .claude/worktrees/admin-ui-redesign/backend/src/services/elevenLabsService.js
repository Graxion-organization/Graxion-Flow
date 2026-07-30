const WebSocket = require('ws');
const logger = require('../utils/logger');

const https = require('https');
const http = require('http');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

/**
 * Generates a complete audio file from text using ElevenLabs REST API.
 * Returns a Buffer containing the MP3 audio data.
 * @param {string} text - The text to convert to speech
 * @param {string} voiceId - Optional ElevenLabs Voice ID (uses default if not provided)
 * @returns {Promise<Buffer>} - MP3 audio buffer
 */
const generateAudioFile = (text, voiceId = null) => {
  const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;

  if (!ELEVENLABS_API_KEY) {
    logger.warn('[ElevenLabs] No API key provided. Returning mock MP3 buffer.');
    // Return a minimal valid-ish buffer for development testing
    return Promise.resolve(Buffer.from('MOCK_ELEVENLABS_AUDIO_BUFFER_FOR_TESTING'));
  }

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.8,
        style: 0.0,
        use_speaker_boost: true
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${selectedVoiceId}`,
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Accept': 'audio/mpeg'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errBody = '';
        res.on('data', (chunk) => errBody += chunk);
        res.on('end', () => {
          reject(new Error(`ElevenLabs API error ${res.statusCode}: ${errBody}`));
        });
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const audioBuffer = Buffer.concat(chunks);
        logger.info(`[ElevenLabs] Audio generated successfully: ${audioBuffer.length} bytes using voice ${selectedVoiceId}`);
        resolve(audioBuffer);
      });
    });

    req.on('error', (err) => {
      logger.error('[ElevenLabs] Request error:', err.message);
      reject(err);
    });

    req.write(body);
    req.end();
  });
};

/**
 * Streams text to ElevenLabs WebSocket and pipes the audio buffers back via callback.
 * Used for legacy streaming use-cases.
 * @param {string} text
 * @param {function} onAudioChunk - callback(Buffer)
 * @param {function} onComplete - callback()
 * @param {string} voiceId - optional voice ID
 */
const streamTextToSpeech = (text, onAudioChunk, onComplete, voiceId = null) => {
  const selectedVoiceId = voiceId || DEFAULT_VOICE_ID;

  if (!ELEVENLABS_API_KEY) {
    logger.warn('[ElevenLabs] No API Key provided. Returning mock audio buffers.');
    setTimeout(() => onAudioChunk(Buffer.from('MOCK_AUDIO_DATA_CHUNK_1')), 500);
    setTimeout(() => onAudioChunk(Buffer.from('MOCK_AUDIO_DATA_CHUNK_2')), 1000);
    setTimeout(onComplete, 1500);
    return;
  }

  const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}/stream-input?model_id=eleven_multilingual_v2`;
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    ws.send(JSON.stringify({
      text: ' ',
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
      xi_api_key: ELEVENLABS_API_KEY,
    }));
    ws.send(JSON.stringify({ text, try_trigger_generation: true }));
    ws.send(JSON.stringify({ text: '' }));
  });

  ws.on('message', (data) => {
    try {
      const response = JSON.parse(data);
      if (response.audio) {
        const audioBuffer = Buffer.from(response.audio, 'base64');
        onAudioChunk(audioBuffer);
      }
      if (response.isFinal) {
        ws.close();
        onComplete();
      }
    } catch (e) {
      logger.error('[ElevenLabs] WebSocket message parse error:', e);
    }
  });

  ws.on('error', (err) => {
    logger.error('[ElevenLabs] WebSocket Error:', err);
    onComplete(err);
  });
};

module.exports = { generateAudioFile, streamTextToSpeech };
