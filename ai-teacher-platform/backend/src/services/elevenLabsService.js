const WebSocket = require('ws');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default voice

/**
 * Streams text to ElevenLabs and pipes the audio buffers back to a callback.
 */
const streamTextToSpeech = (text, onAudioChunk, onComplete) => {
  if (!ELEVENLABS_API_KEY) {
    console.warn('No ElevenLabs API Key provided. Returning mock audio buffers.');
    // Simulate streaming by sending a mock buffer
    setTimeout(() => onAudioChunk(Buffer.from('MOCK_AUDIO_DATA_CHUNK_1')), 500);
    setTimeout(() => onAudioChunk(Buffer.from('MOCK_AUDIO_DATA_CHUNK_2')), 1000);
    setTimeout(onComplete, 1500);
    return;
  }

  const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream-input?model_id=eleven_multilingual_v2`;
  const ws = new WebSocket(wsUrl);

  ws.on('open', () => {
    // Send initialization configuration
    ws.send(JSON.stringify({
      text: " ",
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
      xi_api_key: ELEVENLABS_API_KEY,
    }));

    // Send the actual text to synthesize
    ws.send(JSON.stringify({ text, try_trigger_generation: true }));
    
    // Send EOS
    ws.send(JSON.stringify({ text: "" }));
  });

  ws.on('message', (data) => {
    const response = JSON.parse(data);
    if (response.audio) {
      const audioBuffer = Buffer.from(response.audio, 'base64');
      onAudioChunk(audioBuffer);
    }
    if (response.isFinal) {
      ws.close();
      onComplete();
    }
  });

  ws.on('error', (err) => {
    console.error('ElevenLabs WebSocket Error:', err);
    onComplete(err);
  });
};

module.exports = { streamTextToSpeech };
