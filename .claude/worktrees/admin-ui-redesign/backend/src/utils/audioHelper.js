const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const util = require('util');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const speech = require('@google-cloud/speech');
const logger = require('./logger');

// Initialize the Google Cloud TTS client.
const getTtsClient = () => {
  if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PROJECT_ID) {
    return new textToSpeech.TextToSpeechClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        // Handle both actual newlines and literal \n in the env variable
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    });
  }
  // If no explicit credentials provided, do NOT fall back to default credentials 
  // on a server environment, as it can cause metadata lookup errors and unhandled rejections.
  return null;
};



/**
 * Generate speech from text using Google Cloud Text-to-Speech
 * @param {string} text The text to synthesize
 * @param {string} languageCode The language code, defaults to 'hi-IN'
 * @returns {Promise<string>} The local file path of the generated MP3
 */
const generateSpeech = async (text, languageCode = 'hi-IN') => {
  try {
    const client = getTtsClient();
    if (!client) {
      throw new Error('Google Cloud TTS credentials (GOOGLE_PRIVATE_KEY, etc.) are not configured in environment variables.');
    }

    const request = {
      input: { text: text },
      // Select the language and SSML voice gender
      voice: { languageCode, name: `${languageCode}-Standard-A` },
      // Select the type of audio encoding
      audioConfig: { audioEncoding: 'MP3' },
    };

    // Performs the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);
    
    // Create unique temp file path
    const tempDir = os.tmpdir();
    const fileName = `tts_${uuidv4()}.mp3`;
    const filePath = path.join(tempDir, fileName);

    // Write the binary audio content to a local file
    const writeFile = util.promisify(fs.writeFile);
    await writeFile(filePath, response.audioContent, 'binary');
    
    logger.info(`Generated speech saved to ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error(`Error generating speech: ${error.message}`);
    throw error;
  }
};

/**
 * Delete temporary audio file
 * @param {string} filePath Path to the temporary audio file
 */
const deleteTempAudio = async (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await util.promisify(fs.unlink)(filePath);
      logger.info(`Deleted temporary audio file: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Error deleting temp audio file: ${error.message}`);
  }
};

const { exec } = require('child_process');
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  logger.warn('ffmpeg-static not found, STT might fail for invalid audio formats');
}

const convertToFlac = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('ffmpeg not installed'));
    const command = `"${ffmpegPath}" -i "${inputPath}" -y -ar 16000 -ac 1 -c:a flac "${outputPath}"`;
    exec(command, (error) => {
      if (error) return reject(error);
      resolve(outputPath);
    });
  });
};

/**
 * Converts an audio file to an MP4 video with a black background (for Instagram attachments)
 * @param {string} audioPath Path to the local audio file
 * @param {string} videoPath Path to output the video file
 * @returns {Promise<string>} Path to the generated video file
 */
const convertAudioToVideo = (audioPath, videoPath) => {
  return new Promise((resolve, reject) => {
    let ffmpegPath;
    try {
      ffmpegPath = require('ffmpeg-static');
    } catch (e) {
      logger.warn('ffmpeg-static not found, cannot convert audio to video');
      return reject(new Error('ffmpeg not installed'));
    }
    
    if (!ffmpegPath) return reject(new Error('ffmpeg not installed'));

    const { exec } = require('child_process');
    // Generate a 1-fps black video matching the audio length
    const command = `"${ffmpegPath}" -f lavfi -i color=c=black:s=640x480:r=1 -i "${audioPath}" -c:v libx264 -c:a aac -shortest "${videoPath}" -y`;
    
    exec(command, (error) => {
      if (error) {
        logger.error(`Error converting audio to video: ${error.message}`);
        return reject(error);
      }
      resolve(videoPath);
    });
  });
};

const getSttClient = () => {
  if (process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PROJECT_ID) {
    return new speech.SpeechClient({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GOOGLE_PROJECT_ID,
    });
  }
  return null;
};

/**
 * Transcribe audio file to text using Google Cloud Speech-to-Text
 * @param {string} filePath Path to the local audio file
 * @param {string} languageCode Default language code
 * @returns {Promise<string>} Transcribed text
 */
const transcribeAudio = async (filePath, languageCode = 'hi-IN') => {
  let flacPath = null;
  try {
    const client = getSttClient();
    if (!client) {
      throw new Error('Google Cloud STT credentials (GOOGLE_PRIVATE_KEY, etc.) are not configured in environment variables.');
    }
    
    // Ensure file exists and is not 0 bytes
    const origFile = fs.readFileSync(filePath);
    if (origFile.length === 0) {
      logger.warn(`Downloaded audio file is empty (0 bytes): ${filePath}`);
      return null;
    }

    // Convert to FLAC using ffmpeg for perfect compatibility
    let targetPath = filePath;
    let encoding = 'OGG_OPUS';
    let sampleRateHertz = undefined;

    if (ffmpegPath) {
      flacPath = filePath + '.flac';
      try {
        await convertToFlac(filePath, flacPath);
        targetPath = flacPath;
        encoding = 'FLAC';
        sampleRateHertz = 16000;
        logger.info(`Successfully converted audio to FLAC for STT: ${flacPath}`);
      } catch (convErr) {
        logger.error(`FFmpeg conversion failed, falling back to original OGG: ${convErr.message}`);
        targetPath = filePath;
      }
    }
    
    const file = fs.readFileSync(targetPath);
    const audioBytes = file.toString('base64');

    const audio = {
      content: audioBytes,
    };

    // Fetch active languages for STT
    const SystemSetting = require('../models/SystemSetting');
    const settings = await SystemSetting.find({ 
      key: { $regex: '^lang_' }, value: true 
    });
    const activeCodes = settings.map(s => s.key.replace('lang_', '').replace('_enabled', ''));
    
    let primaryLang = languageCode;
    let alternatives = activeCodes.filter(c => c !== primaryLang).slice(0, 3);
    
    if (alternatives.length === 0) {
       alternatives = ['en-IN', 'en-US', 'hi-IN'].filter(c => c !== primaryLang);
    }
    
    const config = {
      encoding: encoding,
      languageCode: primaryLang,
      alternativeLanguageCodes: alternatives,
    };

    if (sampleRateHertz) {
      config.sampleRateHertz = sampleRateHertz;
    }
    
    const request = {
      audio: audio,
      config: config,
    };

    const [response] = await client.recognize(request);
    
    if (!response.results || response.results.length === 0) {
      logger.warn(`No speech could be recognized from ${targetPath}`);
      return null;
    }

    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
      
    logger.info(`Transcribed audio successfully: ${targetPath}`);
    return transcription.trim();
  } catch (error) {
    logger.error(`Error transcribing audio: ${error.message}`);
    throw error;
  } finally {
    // Cleanup temporary FLAC file if we created one
    if (flacPath && fs.existsSync(flacPath)) {
      try {
        fs.unlinkSync(flacPath);
      } catch (e) {}
    }
  }
};

module.exports = {
  generateSpeech,
  deleteTempAudio,
  transcribeAudio,
  convertAudioToVideo
};
