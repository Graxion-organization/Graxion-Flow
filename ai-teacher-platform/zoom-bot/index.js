require('dotenv').config();
const puppeteer = require('puppeteer');
const io = require('socket.io-client');

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL || 'http://localhost:5000';

// Connect to the backend socket server (admin namespace or a dedicated bot namespace)
const socket = io(SOCKET_SERVER_URL);

socket.on('connect', () => {
  console.log(`Zoom Bot connected to backend Socket.io: ${socket.id}`);
});

/**
 * Launches a headless Chromium browser and joins a Zoom meeting via the Zoom Web SDK.
 */
const joinZoomMeeting = async (payload) => {
  const { zoomJoinUrl, sessionId, meetingId, password, sdkKey, signature } = payload;
  console.log(`[Session ${sessionId}] Launching Headless Bot to join Zoom...`);

  const browser = await puppeteer.launch({
    headless: "new", // or true
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--allow-file-access-from-files',
      '--disable-web-security', // Needed for some Web SDK iframes
      '--no-sandbox',
      '--autoplay-policy=no-user-gesture-required' // Allow audio to play without user interaction
    ]
  });

  const page = await browser.newPage();
  
  // We need to bypass the waiting room and click join.
  // In a real scenario, we'd build a custom Zoom Web SDK page to host the bot locally,
  // then navigate to that local HTML which auto-joins with the JWT signature.
  
  try {
    if (signature && sdkKey && meetingId) {
      // Use the local Zoom Meeting SDK to bypass Captcha
      const sdkUrl = `${SOCKET_SERVER_URL}/bot-sdk.html?meetingNumber=${meetingId}&password=${password || ''}&signature=${signature}&sdkKey=${sdkKey}&userName=AI%20Presenter`;
      console.log(`[Session ${sessionId}] Navigating to Custom SDK App...`);
      await page.goto(sdkUrl, { waitUntil: 'networkidle2' });
      console.log(`[Session ${sessionId}] Automatically joining via SDK...`);
    } else {
      // Fallback to public link
      console.log(`[Session ${sessionId}] Missing SDK Signature. Falling back to public URL.`);
      await page.goto(zoomJoinUrl, { waitUntil: 'networkidle2' });
    }
    
    
    // Setup listeners from backend to control presentation
    const classSocket = io(`${SOCKET_SERVER_URL}/class-${sessionId}`);
    
    classSocket.on('presentation_command', async (cmd) => {
      console.log(`Received command:`, cmd);
      if (cmd.action === 'goto_page') {
        // Execute PDF.js page change inside the browser context
        // await page.evaluate((pageNumber) => window.pdfViewer.gotoPage(pageNumber), cmd.page);
      }
    });

    // Handle ElevenLabs Audio injection via Virtual Mic
    classSocket.on('ai_audio_chunk', (base64Audio) => {
      // In production, the Node.js server receives this buffer and pipes it
      // into a Virtual Audio Cable which Puppeteer's fake-device uses.
      // Alternatively, execute a script in page to play the audio buffer via Web Audio API.
      page.evaluate(async (base64) => {
        if (!window.audioCtx) {
          window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          window.audioQueue = [];
          window.isPlaying = false;
          
          window.playNext = function() {
            if (window.audioQueue.length === 0) {
              window.isPlaying = false;
              return;
            }
            window.isPlaying = true;
            const buffer = window.audioQueue.shift();
            const source = window.audioCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(window.audioCtx.destination);
            source.onended = window.playNext;
            source.start(0);
          };
        }

        // Decode base64 to array buffer
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        try {
          const audioBuffer = await window.audioCtx.decodeAudioData(bytes.buffer);
          window.audioQueue.push(audioBuffer);
          if (!window.isPlaying) {
            window.playNext();
          }
        } catch (e) {
          console.error("Error decoding audio chunk", e);
        }
      }, base64Audio);
    });

  } catch (error) {
    console.error(`[Session ${sessionId}] Bot crashed:`, error);
    await browser.close();
  }
};

// Listen for commands to spawn bots
socket.on('spawn_bot', async (payload) => {
  await joinZoomMeeting(payload);
});

console.log('Zoom Bot Service is running and waiting for commands...');
