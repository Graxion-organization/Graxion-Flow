import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, Video, FileText, UploadCloud, Plus, Mic, Calendar,
  Link, Trash2, X, PlayCircle, Edit3, Type, CheckCircle,
  AlertCircle, Loader2, Volume2, Users, Zap, Eye, EyeOff, Minimize2
} from 'lucide-react';
import { agentAPI, meetingAPI } from '../services/api';
import toast from 'react-hot-toast';
import { getSocket } from '../utils/socket';

// ─── Global Audio Infrastructure ───────────────────────────────────────────────
let globalAudioContext = null;
let globalAudioDestination = null;
let isVirtualMicInitialized = false;
let isRTCPatched = false;
const trackedPeerConnections = new Set(); // Track ALL RTCPeerConnections Zoom creates

// ── Step 1: Create the AudioContext + virtual mic destination ──────────────────
const ensureAudioContext = () => {
  if (!globalAudioContext) {
    globalAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    globalAudioDestination = globalAudioContext.createMediaStreamDestination();
    console.log('[AI Presenter] AudioContext created, state:', globalAudioContext.state);
  }
};

const resumeAudioContext = async () => {
  ensureAudioContext();
  if (globalAudioContext.state !== 'running') {
    await globalAudioContext.resume();
    console.log('[AI Presenter] AudioContext resumed → state:', globalAudioContext.state);
  }
};

// ── Step 2: Patch RTCPeerConnection to track every connection Zoom makes ───────
// This lets us later call replaceTrack() on the audio sender — the RELIABLE
// way to inject audio into any WebRTC session (Zoom, Meet, etc.)
const patchRTCPeerConnection = () => {
  if (isRTCPatched || !window.RTCPeerConnection) return;
  isRTCPatched = true;
  const OriginalRTC = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends OriginalRTC {
    constructor(...args) {
      super(...args);
      trackedPeerConnections.add(this);
      console.log('[AI Presenter] New RTCPeerConnection tracked. Total:', trackedPeerConnections.size);
      this.addEventListener('connectionstatechange', () => {
        if (this.connectionState === 'closed') trackedPeerConnections.delete(this);
      });
    }
  };
  // Copy over static properties (needed for some browsers)
  Object.setPrototypeOf(window.RTCPeerConnection, OriginalRTC);
  console.log('[AI Presenter] ✅ RTCPeerConnection patched — will track all Zoom WebRTC connections');
};

// ── Step 3: After Zoom joins, replace the audio sender's track ─────────────────
// getUserMedia injection might miss if Zoom processes audio differently;
// replaceTrack() on the actual RTCRtpSender is the definitive fix.
const replaceZoomAudioWithVirtualMic = async () => {
  ensureAudioContext();
  const virtualTrack = globalAudioDestination.stream.getAudioTracks()[0];
  if (!virtualTrack) {
    console.warn('[AI Presenter] ⚠️ No virtual audio track to inject yet');
    return false;
  }

  let replacedCount = 0;
  console.log('[AI Presenter] Attempting audio sender replacement across', trackedPeerConnections.size, 'peer connections...');

  for (const pc of trackedPeerConnections) {
    try {
      const senders = pc.getSenders ? pc.getSenders() : [];
      console.log('[AI Presenter] PC state:', pc.connectionState, '— senders:', senders.length);
      for (const sender of senders) {
        if (sender.track && sender.track.kind === 'audio') {
          await sender.replaceTrack(virtualTrack);
          replacedCount++;
          console.log('[AI Presenter] ✅ replaceTrack() succeeded on audio sender');
        }
      }
    } catch (err) {
      console.warn('[AI Presenter] replaceTrack() error:', err.message);
    }
  }

  console.log(`[AI Presenter] Audio injection complete: ${replacedCount}/${trackedPeerConnections.size} connections updated`);
  return replacedCount > 0;
};

// ── Step 4: Also patch getUserMedia as a secondary backup ─────────────────────
const initVirtualMic = () => {
  if (isVirtualMicInitialized) return;
  isVirtualMicInitialized = true;
  ensureAudioContext();

  const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints) => {
    console.log('[AI Presenter] getUserMedia intercepted:', JSON.stringify(constraints));
    if (globalAudioContext && globalAudioContext.state !== 'running') {
      try { await globalAudioContext.resume(); } catch(e) {}
    }
    let stream;
    try {
      stream = await originalGetUserMedia(constraints);
    } catch (err) {
      console.warn('[AI Presenter] Real mic unavailable:', err.message);
      stream = new MediaStream();
    }
    if (constraints && constraints.audio) {
      const newStream = new MediaStream();
      const virtualTrack = globalAudioDestination.stream.getAudioTracks()[0];
      if (virtualTrack) {
        newStream.addTrack(virtualTrack);
        console.log('[AI Presenter] ✅ Virtual audio track added to getUserMedia stream');
      }
      stream.getVideoTracks().forEach(t => newStream.addTrack(t));
      return newStream;
    }
    return stream;
  };
  console.log('[AI Presenter] ✅ getUserMedia patched (backup injection layer)');
};

const ZoomMeetingModal = ({ meeting, sdkData, audioUrl, onClose, onComplete, meetingId, onMinimize }) => {
  const isVideoMode = meeting?.presentationType === 'video';
  const videoUrl = meeting?.videoUrl;
  const meetingSDKElementRef = useRef(null);
  const zoomClientRef = useRef(null);
  const [zoomStatus, setZoomStatus] = useState('initializing');
  const [errorMsg, setErrorMsg] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const apiBaseUrl = process.env.REACT_APP_API_URL
    ? process.env.REACT_APP_API_URL.replace('/api', '')
    : 'http://localhost:5000';

  useEffect(() => {
    // CRITICAL ORDER: patch RTCPeerConnection FIRST so we capture
    // every WebRTC connection Zoom creates during init + join
    patchRTCPeerConnection();
    // Then patch getUserMedia as a secondary backup injection layer
    initVirtualMic();
    // Resume AudioContext early (browser may auto-suspend it)
    resumeAudioContext().catch(() => {});
  }, []);

  const playAudioThroughZoomMic = useCallback(async (audioSrc) => {
    try {
      setZoomStatus('speaking');
      console.log('[AI Presenter] Fetching audio from:', audioSrc);

      // 1. Fetch the audio file
      const response = await fetch(audioSrc);
      if (!response.ok) throw new Error(`Failed to fetch audio file: HTTP ${response.status} from ${audioSrc}`);
      const arrayBuffer = await response.arrayBuffer();
      console.log('[AI Presenter] Audio fetched, size:', arrayBuffer.byteLength, 'bytes');

      // 2. Ensure AudioContext is running — MUST be resumed here (user gesture context)
      ensureAudioContext();
      if (globalAudioContext.state !== 'running') {
        console.log('[AI Presenter] Resuming AudioContext, current state:', globalAudioContext.state);
        await globalAudioContext.resume();
      }
      console.log('[AI Presenter] AudioContext state:', globalAudioContext.state);

      const audioBuffer = await globalAudioContext.decodeAudioData(arrayBuffer);
      console.log(`[AI Presenter] Audio decoded: ${audioBuffer.duration.toFixed(1)}s, ${audioBuffer.numberOfChannels}ch, ${audioBuffer.sampleRate}Hz`);

      // 3. Connect source → virtualDestination ONLY
      // ⚠️ DO NOT connect to globalAudioContext.destination (local speakers)!
      // If we play locally AND send via virtual mic, Zoom's Echo Cancellation
      // detects the "echo" and SUPPRESSES our audio before transmitting.
      const source = globalAudioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Route to Zoom's virtual mic ONLY (not local speakers)
      source.connect(globalAudioDestination);
      // NOTE: intentionally NOT doing: source.connect(globalAudioContext.destination)
      // Zoom EC would cancel audio that's simultaneously playing on speakers

      source.start(0);
      console.log('[AI Presenter] ▶️ Audio started playing through virtual mic');
      console.log('[AI Presenter] Virtual mic stream tracks:', globalAudioDestination.stream.getAudioTracks().length);

      source.onended = async () => {
        console.log('[AI Presenter] ✅ Audio presentation completed');
        setZoomStatus('completed');
        try {
          await meetingAPI.complete(meetingId);
        } catch (e) {
          console.warn('[AI Presenter] Could not mark meeting complete:', e.message);
        }
        onComplete && onComplete();
      };
    } catch (err) {
      console.error('[AI Presenter] ❌ Audio playback error:', err);
      setErrorMsg(`Audio error: ${err.message}`);
      setZoomStatus('error');
    }
  }, [meetingId, onComplete]);

  const playVideoThroughZoom = useCallback(async (videoSrc, client) => {
    try {
      setZoomStatus('speaking');
      console.log('[AI Presenter] 🎬 Playing video presentation:', videoSrc);

      const videoEl = document.createElement('video');
      videoEl.src = videoSrc;
      videoEl.crossOrigin = 'anonymous';
      videoEl.muted = false; // We need audio to capture
      // Hide the video element but keep it in DOM for playback
      videoEl.style.position = 'fixed';
      videoEl.style.top = '0';
      videoEl.style.left = '0';
      videoEl.style.width = '1px';
      videoEl.style.height = '1px';
      videoEl.style.opacity = '0';
      videoEl.style.pointerEvents = 'none';
      document.body.appendChild(videoEl);

      await videoEl.play();
      console.log('[AI Presenter] 🎬 Video started playing locally');

      ensureAudioContext();
      if (globalAudioContext.state !== 'running') await globalAudioContext.resume();

      // 1. Capture stream
      const capturedStream = videoEl.captureStream ? videoEl.captureStream() : videoEl.mozCaptureStream();

      // 2. Route audio to virtual mic ONLY
      const audioTrack = capturedStream.getAudioTracks()[0];
      if (audioTrack) {
        const audioSource = globalAudioContext.createMediaStreamSource(new MediaStream([audioTrack]));
        audioSource.connect(globalAudioDestination);
        console.log('[AI Presenter] 🎬 Video audio routed to virtual mic');
      } else {
        console.warn('[AI Presenter] ⚠️ No audio track found in video stream');
      }

      // 3. Start Screen Share in Zoom
      try {
        console.log('[AI Presenter] 🎬 Attempting to start screen share...');
        
        // Temporarily patch getDisplayMedia to return our video stream
        const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
        navigator.mediaDevices.getDisplayMedia = async () => {
          console.log('[AI Presenter] Intercepted getDisplayMedia for screen share');
          return new MediaStream(capturedStream.getVideoTracks());
        };

        // Try to click the Share Screen button
        const shareSelectors = [
          '[aria-label="Share Screen"]',
          '.share-button__button',
          'button[class*="share"]'
        ];
        
        let clicked = false;
        for (const sel of shareSelectors) {
          const btn = meetingSDKElementRef.current?.querySelector(sel) || document.querySelector(sel);
          if (btn && !btn.disabled) {
            btn.click();
            clicked = true;
            console.log('[AI Presenter] 🎬 Clicked Share Screen button:', sel);
            break;
          }
        }

        if (!clicked) {
          console.warn('[AI Presenter] ⚠️ Could not find Share Screen button. Trying SDK API...');
          if (typeof client.startShareScreen === 'function') {
             await client.startShareScreen();
          }
        }

        // Restore after 10 seconds to be safe
        setTimeout(() => {
          navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
        }, 10000);

      } catch (e) {
        console.warn('[AI Presenter] ⚠️ Screen share initiation failed:', e.message);
      }

      videoEl.onended = async () => {
        console.log('[AI Presenter] 🎬 Video presentation ended');
        document.body.removeChild(videoEl);
        setZoomStatus('completed');
        try { await meetingAPI.complete(meetingId); } catch(e){}
        onComplete && onComplete();
      };
    } catch (err) {
      console.error('[AI Presenter] ❌ Video error:', err);
      setErrorMsg(`Video error: ${err.message}`);
      setZoomStatus('error');
    }
  }, [meetingId, onComplete]);

  useEffect(() => {
    let isMounted = true;

    const initZoom = async () => {
      try {
        const { loadZoomSdk } = await import('../utils/scriptLoader');
        await loadZoomSdk();

        if (!window.ZoomMtgEmbedded) {
          throw new Error('Zoom Meeting SDK is not loaded or failed to fetch dynamically.');
        }

        if (!isMounted || !meetingSDKElementRef.current) return;

        const client = window.ZoomMtgEmbedded.createClient();
        zoomClientRef.current = client;

        console.log('[AI Presenter] Initializing Zoom SDK client...');

        // Initialize the Zoom client in the container div
        await client.init({
          zoomAppRoot: meetingSDKElementRef.current,
          language: 'en-US',
          customize: {
            meetingInfo: ['topic', 'host', 'participant'],
            toolbar: {
              buttons: [
                { text: 'End Presentation', className: 'btn-end', onClick: onClose }
              ]
            },
            // Join with microphone active (not muted) from the start
            audio: {
              startWithMicMuted: false,
              startWithSpeakerMuted: false
            }
          }
        });

        if (!isMounted) return;
        setZoomStatus('joining');

        if (!sdkData) {
          throw new Error('Zoom SDK credentials not configured. Please add ZOOM_SDK_KEY and ZOOM_SDK_SECRET to your server .env file.');
        }

        console.log('[AI Presenter] Joining meeting:', sdkData.meetingNumber);

        // Join the meeting as "AI Presenter"
        await client.join({
          signature: sdkData.signature,
          sdkKey: sdkData.sdkKey,
          meetingNumber: sdkData.meetingNumber,
          password: sdkData.password || '',
          userName: sdkData.userName || 'AI Presenter',
          userEmail: sdkData.userEmail || ''
        });

        if (!isMounted) return;
        setZoomStatus('joined');
        console.log('[AI Presenter] ✅ Joined Zoom meeting successfully!');

        // ── CRITICAL STEP 1: Wait for Zoom to establish WebRTC connections ──────
        // Zoom creates RTCPeerConnections shortly after join() resolves.
        // We wait so trackedPeerConnections is populated before we try replaceTrack.
        await new Promise(r => setTimeout(r, 2500));

        if (!isMounted) return;

        // ── CRITICAL STEP 2: Activate Zoom Audio (DOM + SDK) ────────────────────
        // Zoom Component View shows a "Join Audio" dialog or mute button.
        // client.mute(false) is a host-only API and won't unmute ourselves.
        // The reliable approach: find and click Zoom's audio button via DOM.
        const activateZoomAudio = () => new Promise((resolve) => {
          let resolved = false;
          const AUDIO_SELECTORS = [
            '[aria-label="Join Audio by Computer"]',
            '[aria-label="Unmute"]',
            '[aria-label="Unmute My Microphone"]',
            'button.join-audio-by-voip__join-btn',
            'button[class*="join-audio"]',
            '.join-audio-container__btn',
            '[class*="audio-btn"]',
            'button[class*="audio"][class*="btn"]',
          ];

          const tryClick = () => {
            if (resolved) return;
            for (const sel of AUDIO_SELECTORS) {
              const el = meetingSDKElementRef.current?.querySelector(sel)
                      || document.querySelector(sel);
              if (el && !el.disabled) {
                el.click();
                console.log(`[AI Presenter] ✅ Clicked Zoom audio button: ${sel}`);
                resolved = true;
                resolve(true);
                return;
              }
            }
          };

          // Watch for Zoom's UI to render the audio button
          const observer = new MutationObserver(tryClick);
          observer.observe(
            meetingSDKElementRef.current || document.body,
            { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label'] }
          );

          // Also try at intervals (some buttons appear with delay)
          tryClick();
          const timers = [500, 1000, 1500, 2000, 3000].map(ms =>
            setTimeout(tryClick, ms)
          );

          // Give up after 8 seconds
          setTimeout(() => {
            observer.disconnect();
            timers.forEach(clearTimeout);
            if (!resolved) {
              console.warn('[AI Presenter] ⚠️ Could not auto-click Zoom audio button — mic may stay muted');
              resolve(false);
            }
          }, 8000);
        });

        const audioActivated = await activateZoomAudio();
        console.log('[AI Presenter] Zoom audio activation result:', audioActivated);

        // Also try Zoom SDK API as a secondary attempt (might work on some SDK versions)
        try {
          if (typeof client.mute === 'function') await client.mute(false);
        } catch (e) { /* ignore */ }

        // ── CRITICAL STEP 3: Replace audio sender track via RTCRtpSender ────────
        // This is the RELIABLE method — directly swaps the audio track in the
        // WebRTC peer connection so our virtual mic audio flows to Zoom participants.
        const replaced = await replaceZoomAudioWithVirtualMic();
        if (!replaced) {
          console.warn('[AI Presenter] ⚠️ No audio senders replaced — getUserMedia injection is the only active layer.');
        }

        if (isVideoMode) {
          if (!videoUrl) {
            setZoomStatus('error');
            setErrorMsg('Video URL is missing for video presentation.');
            return;
          }
          await playVideoThroughZoom(videoUrl, client);
        } else {
          if (!audioUrl) {
            setZoomStatus('speaking');
            toast('⚠️ No audio generated. Check your TTS API key in server .env', { icon: '🔇', duration: 8000 });
            return;
          }

          // ── CRITICAL STEP 4: Play audio through the virtual mic ─────────────────
          // Wait a bit more to let replaceTrack propagate through the WebRTC stack
          await new Promise(r => setTimeout(r, 1000));

          const fullAudioUrl = audioUrl.startsWith('http')
            ? audioUrl
            : `${apiBaseUrl}${audioUrl}`;

          console.log('[AI Presenter] 🔊 Starting audio playback:', fullAudioUrl);
          await playAudioThroughZoomMic(fullAudioUrl);
        }

      } catch (err) {
        console.error('[Zoom SDK] ❌ Error:', err);
        if (isMounted) {
          setErrorMsg(err.message || 'Failed to join Zoom meeting');
          setZoomStatus('error');
        }
      }
    };

    initZoom();

    return () => {
      isMounted = false;
      // Leave Zoom meeting on cleanup
      if (zoomClientRef.current) {
        try { zoomClientRef.current.leaveMeeting(); } catch (e) {}
      }
    };
  }, [apiBaseUrl]); // We intentionally leave out sdkData/audioUrl/functions so it only runs ONCE on mount

  const statusConfig = {
    initializing: { label: 'Initializing Zoom SDK...', color: 'text-yellow-400', pulse: true },
    joining:      { label: 'Joining Zoom Meeting...', color: 'text-blue-400', pulse: true },
    joined:       { label: 'Joined! Preparing audio...', color: 'text-green-400', pulse: true },
    speaking:     { label: '🔴 LIVE — AI is presenting', color: 'text-red-400', pulse: true },
    completed:    { label: '✅ Presentation Complete!', color: 'text-emerald-400', pulse: false },
    error:        { label: `❌ Error: ${errorMsg}`, color: 'text-red-500', pulse: false },
  };

  const current = statusConfig[zoomStatus] || statusConfig.initializing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
      <div className="bg-[#0F0F13] border border-white/10 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col" style={{ height: '90vh' }}>
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1A1A24]">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full bg-red-500 ${current.pulse ? 'animate-pulse' : ''}`} />
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-400" />
              {meeting?.topic || 'AI Presentation'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${current.color}`}>{current.label}</span>
            <button
              onClick={onMinimize}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              title="Minimize to Background"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              title="Close & End Presentation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Zoom SDK Mount Point */}
        <div className="flex-1 relative bg-[#0A0A10]">
          <div
            id="meetingSDKElement"
            ref={meetingSDKElementRef}
            className="w-full h-full"
          />

          {/* Status Overlay (shown while loading) */}
          {(zoomStatus === 'initializing' || zoomStatus === 'joining' || zoomStatus === 'joined') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A10]/90 z-10">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 animate-pulse">
                <Bot className="w-10 h-10 text-indigo-400" />
              </div>
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
              <p className={`text-lg font-semibold ${current.color}`}>{current.label}</p>
              <p className="text-slate-500 text-sm mt-2">Meeting: {meeting?.topic}</p>
            </div>
          )}

          {/* Error Overlay */}
          {zoomStatus === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0A0A10]/90 z-10 p-8">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">Failed to Start Presentation</h4>
              <p className="text-slate-400 text-center text-sm max-w-md mb-6">{errorMsg}</p>
              {errorMsg.includes('ZOOM_SDK_KEY') && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 max-w-lg text-sm text-yellow-300">
                  <p className="font-semibold mb-2">⚙️ Setup Required:</p>
                  <p>Add these to your backend <code className="text-yellow-200">.env</code> file:</p>
                  <pre className="mt-2 text-yellow-200 text-xs">ZOOM_SDK_KEY=your_sdk_key{'\n'}ZOOM_SDK_SECRET=your_sdk_secret</pre>
                  <p className="mt-2 text-yellow-400 text-xs">Get these from Zoom Marketplace → Create App → Meeting SDK type</p>
                </div>
              )}
              <button onClick={onClose} className="mt-4 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all">
                Close
              </button>
            </div>
          )}

          {/* Completed Overlay */}
          {zoomStatus === 'completed' && (
            <div className="absolute bottom-0 left-0 right-0 bg-emerald-900/80 border-t border-emerald-500/30 p-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Presentation completed successfully!</span>
              </div>
              <button onClick={onClose} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm transition-all">
                Close Session
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Create Agent Modal ────────────────────────────────────────────────────────
const CreateAgentModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '',
    systemPrompt: 'You are a professional AI presenter. Speak clearly, confidently, and engagingly. Summarize key points and make the content easy to understand.',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [showVoiceId, setShowVoiceId] = useState(false);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Agent name is required.'); return; }
    if (!form.systemPrompt.trim()) { toast.error('Persona/System Prompt is required.'); return; }
    setIsCreating(true);
    try {
      await agentAPI.create({
        name: form.name.trim(),
        systemPrompt: form.systemPrompt.trim(),
        elevenLabsVoiceId: form.elevenLabsVoiceId.trim() || '21m00Tcm4TlvDq8ikWAM',
        agentType: 'presenter',
        platform: 'all',
        model: 'gpt-4o',
        aiProvider: 'openai',
        maxTokens: 1000
      });
      toast.success('Presenter Agent created!');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create agent.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-purple-500" /> New Presenter Agent
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Agent Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="e.g., Sales Presenter, Product Demo Bot"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Persona / System Prompt *</label>
            <textarea
              rows={4}
              value={form.systemPrompt}
              onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
              className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
              placeholder="Describe how the AI should behave and present..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              ElevenLabs Voice ID
              <span className="text-xs text-slate-400 ml-2">(optional — leave default or get from elevenlabs.io)</span>
            </label>
            <div className="relative">
              <input
                type={showVoiceId ? 'text' : 'password'}
                value={form.elevenLabsVoiceId}
                onChange={e => setForm(f => ({ ...f, elevenLabsVoiceId: e.target.value }))}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm"
                placeholder="21m00Tcm4TlvDq8ikWAM"
              />
              <button
                type="button"
                onClick={() => setShowVoiceId(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {showVoiceId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isCreating ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Agent</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Agent Modal ────────────────────────────────────────────────────────
const EditAgentModal = ({ agent, onClose, onUpdated }) => {
  const [form, setForm] = useState({
    name: agent?.name || '',
    systemPrompt: agent?.systemPrompt || '',
    elevenLabsVoiceId: agent?.elevenLabsVoiceId || ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [showVoiceId, setShowVoiceId] = useState(false);

  const handleUpdate = async () => {
    if (!form.name.trim()) { toast.error('Agent name is required.'); return; }
    if (!form.systemPrompt.trim()) { toast.error('Persona/System Prompt is required.'); return; }
    setIsUpdating(true);
    try {
      await agentAPI.update(agent._id, {
        name: form.name.trim(),
        systemPrompt: form.systemPrompt.trim(),
        elevenLabsVoiceId: form.elevenLabsVoiceId.trim() || '21m00Tcm4TlvDq8ikWAM'
      });
      toast.success('Agent updated!');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update agent.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-purple-500" /> Edit Agent
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Agent Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Persona / System Prompt *</label>
            <textarea
              rows={4}
              value={form.systemPrompt}
              onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
              className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              ElevenLabs Voice ID
            </label>
            <div className="relative">
              <input
                type={showVoiceId ? 'text' : 'password'}
                value={form.elevenLabsVoiceId}
                onChange={e => setForm(f => ({ ...f, elevenLabsVoiceId: e.target.value }))}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 pr-10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowVoiceId(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {showVoiceId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Schedule Modal ────────────────────────────────────────────────────────────
const ScheduleModal = ({ agents, onClose, onScheduled }) => {
  const [data, setData] = useState({ 
    agentId: agents[0]?._id || '', 
    topic: '', 
    date: '', 
    time: '', 
    duration: 30,
    presentationType: 'ai_voice',
    videoUrl: ''
  });
  const [isScheduling, setIsScheduling] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (e.g. 500MB limit for UI)
    if (file.size > 500 * 1024 * 1024) {
      toast.error('Video file is too large. Max 500MB allowed.');
      return;
    }

    const formData = new FormData();
    formData.append('video', file);

    try {
      setUploadProgress(1); // Start
      const res = await meetingAPI.uploadVideo(formData, (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(percentCompleted);
      });
      
      setData(d => ({ ...d, videoUrl: res.data.videoUrl }));
      toast.success('Video uploaded successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(err.response?.data?.message || 'Failed to upload video');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleSubmit = async () => {
    if (!data.topic || !data.date || !data.time) { toast.error('Please fill all fields.'); return; }
    if (data.presentationType === 'ai_voice' && !data.agentId) { toast.error('Please select an agent.'); return; }
    if (data.presentationType === 'video' && !data.videoUrl) { toast.error('Please upload a video file.'); return; }
    
    setIsScheduling(true);
    try {
      const scheduledStartTime = new Date(`${data.date}T${data.time}`);
      await meetingAPI.create({
        agentId: data.agentId,
        topic: data.topic,
        scheduledStartTime,
        durationMinutes: parseInt(data.duration),
        presentationType: data.presentationType,
        videoUrl: data.videoUrl
      });
      toast.success('Presentation Scheduled!');
      onScheduled();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule.');
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" /> Schedule Presentation
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Presentation Type</label>
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${data.presentationType === 'ai_voice' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                onClick={() => setData(d => ({ ...d, presentationType: 'ai_voice' }))}
              >
                AI Voice (Script)
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${data.presentationType === 'video' ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                onClick={() => setData(d => ({ ...d, presentationType: 'video' }))}
              >
                Upload Video
              </button>
            </div>
          </div>

          {data.presentationType === 'ai_voice' ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Agent</label>
              <select
                value={data.agentId}
                onChange={e => setData(d => ({ ...d, agentId: e.target.value }))}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                {agents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Upload Video (MP4/MOV)</label>
              <div className="border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl p-4 text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors relative">
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm"
                  onChange={handleVideoUpload}
                  disabled={uploadProgress > 0}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                {uploadProgress > 0 ? (
                  <div className="space-y-2">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Uploading: {uploadProgress}%</p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                      <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }}></div>
                    </div>
                  </div>
                ) : data.videoUrl ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Video Uploaded Successfully</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Click to replace video</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadCloud className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Click or drag video to upload</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Supports large files up to 500MB</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Topic</label>
            <input type="text" value={data.topic} onChange={e => setData(d => ({ ...d, topic: e.target.value }))}
              className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="e.g., Q3 Marketing Plan" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input type="date" value={data.date} onChange={e => setData(d => ({ ...d, date: e.target.value }))}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
              <input type="time" value={data.time} onChange={e => setData(d => ({ ...d, time: e.target.value }))}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration</label>
            <select value={data.duration} onChange={e => setData(d => ({ ...d, duration: e.target.value }))}
              className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>
          <div className="pt-2">
            <button onClick={handleSubmit} disabled={isScheduling}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isScheduling ? <><Loader2 className="w-4 h-4 animate-spin" /> Scheduling...</> : <><Calendar className="w-4 h-4" /> Schedule Zoom Meeting</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Edit Meeting Modal ────────────────────────────────────────────────────────
const EditMeetingModal = ({ meeting, onClose, onUpdated }) => {
  const d = new Date(meeting.scheduledStartTime);
  const [data, setData] = useState({
    topic: meeting.topic,
    date: d.toISOString().split('T')[0],
    time: d.toTimeString().substring(0, 5),
    duration: meeting.durationMinutes || 30
  });
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSubmit = async () => {
    if (!data.topic || !data.date || !data.time) { toast.error('Please fill all fields.'); return; }
    setIsUpdating(true);
    try {
      await meetingAPI.update(meeting._id, {
        topic: data.topic,
        scheduledStartTime: new Date(`${data.date}T${data.time}`),
        durationMinutes: parseInt(data.duration)
      });
      toast.success('Presentation Updated!');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error('Failed to update presentation.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Edit Presentation</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Topic</label>
            <input type="text" value={data.topic} onChange={e => setData(d => ({ ...d, topic: e.target.value }))}
              className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input type="date" value={data.date} onChange={e => setData(d => ({ ...d, date: e.target.value }))}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
              <input type="time" value={data.time} onChange={e => setData(d => ({ ...d, time: e.target.value }))}
                className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration</label>
            <select value={data.duration} onChange={e => setData(d => ({ ...d, duration: e.target.value }))}
              className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50">
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>
          <div className="pt-2">
            <button onClick={handleSubmit} disabled={isUpdating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isUpdating ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Presentation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Add Text Prompt Modal ─────────────────────────────────────────────────────
const TextPromptModal = ({ agentId, onClose, onAdded }) => {
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) { toast.error('Please enter some text.'); return; }
    setIsSaving(true);
    try {
      await agentAPI.addKnowledgeText(agentId, text.trim());
      toast.success('Text added to AI Brain!');
      onAdded();
      onClose();
    } catch (err) {
      toast.error('Failed to save text prompt.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Type className="w-5 h-5 text-purple-500" /> Add Text to AI Brain
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <textarea
          rows={8}
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
          placeholder="Paste your script, product details, talking points, or any information the AI should use during the Zoom presentation..."
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={handleSubmit} disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all disabled:opacity-50">
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Zap className="w-4 h-4" /> Save to AI Brain</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Bot Status Badge ─────────────────────────────────────────────────────────
const BotStatusBadge = ({ status }) => {
  const configs = {
    generating_script: { label: 'Generating Script...', cls: 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20', pulse: true },
    generating_audio:  { label: 'Generating Audio...', cls: 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/20', pulse: true },
    joining:           { label: 'Joining Zoom...', cls: 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20', pulse: true },
    speaking:          { label: '🔴 LIVE', cls: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20', pulse: true },
    completed:         { label: '✅ Completed', cls: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20', pulse: false },
    error:             { label: '❌ Error', cls: 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20', pulse: false },
  };
  const cfg = configs[status];
  if (!cfg) return null;
  return (
    <span className={`px-2 py-1 text-xs rounded border font-medium ${cfg.cls} ${cfg.pulse ? 'animate-pulse' : ''}`}>
      {cfg.label}
    </span>
  );
};

// ─── Main Page Component ───────────────────────────────────────────────────────
export default function AIPresenterPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [agents, setAgents] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAgentForKb, setSelectedAgentForKb] = useState('');

  // Modals
  const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
  const [editAgent, setEditAgent] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editMeeting, setEditMeeting] = useState(null);
  const [showTextPromptModal, setShowTextPromptModal] = useState(false);

  // Active Zoom Session
  const [activeMeetingSession, setActiveMeetingSession] = useState(null);
  const [isMeetingMinimized, setIsMeetingMinimized] = useState(false);
  // { meeting, sdkData, audioUrl }

  // Bot statuses from socket
  const [botStatuses, setBotStatuses] = useState({});
  // Loading states for start bot
  const [startingBots, setStartingBots] = useState({});

  const fileInputRef = useRef(null);

  // ── Prevent Accidental Refresh ─────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (activeMeetingSession) {
        e.preventDefault();
        e.returnValue = 'AI Presenter is live! If you refresh, the bot will leave the meeting. Are you sure?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeMeetingSession]);

  // ── Computed Stats ─────────────────────────────────────────
  const stats = {
    activeAgents: agents.length,
    presentations: meetings.length,
    kbFiles: agents.reduce((sum, a) => sum + (a.knowledgeBase?.length || 0), 0)
  };


  // ── Socket Connection ──────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    const handleBotStatus = ({ meetingId, status }) => {
      setBotStatuses(prev => ({ ...prev, [meetingId]: status }));
    };

    socket.on('bot_status', handleBotStatus);

    return () => socket.off('bot_status', handleBotStatus);
  }, []);

  // ── Data Fetching ──────────────────────────────────────────
  const fetchAgents = useCallback(async () => {
    try {
      const { data } = await agentAPI.getAll();
      const presenterAgents = data.data?.agents?.filter(a => a.agentType === 'presenter') || [];
      setAgents(presenterAgents);
      if (presenterAgents.length > 0 && !selectedAgentForKb) {
        setSelectedAgentForKb(presenterAgents[0]._id);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  }, [selectedAgentForKb]);

  const fetchMeetings = useCallback(async () => {
    try {
      const { data } = await meetingAPI.getAll();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching meetings:', err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchAgents(), fetchMeetings()]);
      setIsLoading(false);
    };
    load();
  }, [fetchAgents, fetchMeetings]);

  // ── Handlers ───────────────────────────────────────────────
  const handleModalClose = useCallback(() => {
    setActiveMeetingSession(null);
    fetchMeetings();
  }, [fetchMeetings]);

  const handleModalComplete = useCallback((mId) => {
    setBotStatuses(prev => ({ ...prev, [mId]: 'completed' }));
  }, []);

  const handleDeleteAgent = async (agentId) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) return;
    try {
      await agentAPI.delete(agentId);
      setAgents(prev => prev.filter(a => a._id !== agentId));
      toast.success('Agent deleted.');
    } catch { toast.error('Failed to delete agent.'); }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm('Delete this scheduled presentation?')) return;
    try {
      await meetingAPI.delete(meetingId);
      setMeetings(prev => prev.filter(m => m._id !== meetingId));
      toast.success('Presentation deleted.');
    } catch { toast.error('Failed to delete presentation.'); }
  };

  const handleStartBot = async (meeting) => {
    setStartingBots(prev => ({ ...prev, [meeting._id]: true }));
    setBotStatuses(prev => ({ ...prev, [meeting._id]: 'generating_script' }));
    toast('⏳ Generating AI presentation & audio...', { icon: '🤖', duration: 6000 });

    try {
      const { data } = await meetingAPI.startBot(meeting._id);
      // Backend response: { meeting: { audioUrl, ... }, sdkData, script }
      // audioUrl lives inside data.meeting — NOT at top-level data.audioUrl

      console.log('[StartBot] API response:', {
        hasSDKData: !!data.sdkData,
        audioUrl: data.meeting?.audioUrl,
        meetingId: data.meeting?._id
      });

      if (!data.sdkData) {
        toast.error('Zoom SDK credentials missing. See .env setup.', { duration: 8000 });
        setBotStatuses(prev => ({ ...prev, [meeting._id]: 'error' }));
        return;
      }

      if (data.meeting?.presentationType !== 'video' && !data.meeting?.audioUrl) {
        toast.error('⚠️ Audio generation failed on server. Check TTS API keys in backend .env', { duration: 8000 });
        setBotStatuses(prev => ({ ...prev, [meeting._id]: 'error' }));
        return;
      }

      setBotStatuses(prev => ({ ...prev, [meeting._id]: 'joining' }));
      toast.success('Script & audio ready! Opening Zoom session...');

      // Open Zoom SDK modal with all required data
      // audioUrl is inside data.meeting — pass it correctly
      setActiveMeetingSession({
        meeting: data.meeting,
        sdkData: data.sdkData,
        audioUrl: data.meeting.audioUrl   // ✅ FIXED: was data.audioUrl (undefined)
      });

    } catch (err) {
      console.error('Start bot error:', err);
      setBotStatuses(prev => ({ ...prev, [meeting._id]: 'error' }));
      toast.error(err.response?.data?.message || 'Failed to start AI Presenter.');
    } finally {
      setStartingBots(prev => ({ ...prev, [meeting._id]: false }));
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!selectedAgentForKb) { toast.error('Please select an agent first.'); return; }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploading(true);
    try {
      await agentAPI.uploadKnowledgeBase(selectedAgentForKb, formData);
      toast.success(`"${file.name}" uploaded & text extracted!`);
      fetchAgents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload file.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteKbEntry = async (agentId, entryIndex, fileName) => {
    if (!window.confirm(`Delete "${fileName}" from knowledge base?`)) return;
    try {
      await agentAPI.deleteKnowledgeBaseEntry(agentId, entryIndex);
      toast.success('KB entry deleted.');
      fetchAgents();
    } catch { toast.error('Failed to delete KB entry.'); }
  };

  // ── Render Tabs ─────────────────────────────────────────────
  const TAB_CONFIG = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'agents', label: 'My Agents' },
    { id: 'materials', label: 'Knowledge Base' },
    { id: 'meetings', label: 'Presentations' },
  ];

  const selectedAgent = agents.find(a => a._id === selectedAgentForKb);

  return (
    <div className="w-full h-full flex flex-col font-sans relative">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">AI Presenter</h1>
          <p className="text-slate-500 mt-1 text-sm">Virtual AI bot that joins Zoom and presents your content via voice.</p>
        </div>
        <nav className="flex space-x-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-purple-600 shadow text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab Content ─────────────────────────────────────── */}
      <div className="flex-1 w-full bg-white dark:bg-[#0A0A0B] rounded-2xl border border-slate-200 dark:border-white/10 overflow-y-auto p-8 shadow-sm">

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          </div>
        ) : (
          <>
            {/* ── DASHBOARD TAB ───────────────────────────── */}
            {activeTab === 'dashboard' && (
              <>
                {/* Action Buttons */}
                <div className="flex flex-wrap justify-end gap-3 mb-8">
                  <button
                    onClick={() => setShowCreateAgentModal(true)}
                    className="bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all"
                  >
                    <Plus className="w-4 h-4" /> New Agent
                  </button>
                  <button
                    onClick={() => agents.length > 0 ? setShowScheduleModal(true) : toast.error('Create an agent first!')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all"
                  >
                    <Video className="w-4 h-4" /> Schedule Zoom
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {[
                    { label: 'Active Agents', value: stats.activeAgents, icon: Bot, color: 'from-blue-500/10 to-blue-500/5', text: 'text-blue-500' },
                    { label: 'Scheduled Presentations', value: stats.presentations, icon: Calendar, color: 'from-purple-500/10 to-purple-500/5', text: 'text-purple-500' },
                    { label: 'Knowledge Base Files', value: stats.kbFiles, icon: FileText, color: 'from-emerald-500/10 to-emerald-500/5', text: 'text-emerald-500' },
                  ].map((stat, i) => (
                    <div key={i} className={`bg-gradient-to-br ${stat.color} border border-slate-100 dark:border-white/5 rounded-2xl p-6 relative overflow-hidden group`}>
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <stat.icon className={`w-16 h-16 ${stat.text}`} />
                      </div>
                      <p className="text-slate-500 dark:text-gray-400 text-sm font-medium mb-1">{stat.label}</p>
                      <h3 className="text-4xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
                    </div>
                  ))}
                </div>

                {/* Quick View: Agents + Recent Meetings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Agents */}
                  <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Your Presenters</h3>
                      <button onClick={() => setShowCreateAgentModal(true)} className="text-purple-500 hover:text-purple-400 text-sm flex items-center gap-1 transition-colors">
                        <Plus className="w-3 h-3" /> Add
                      </button>
                    </div>
                    <div className="space-y-3">
                      {agents.length === 0 ? (
                        <div className="text-center py-8">
                          <Bot className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">No agents yet.</p>
                          <button onClick={() => setShowCreateAgentModal(true)} className="mt-2 text-purple-500 text-sm hover:underline">Create your first agent →</button>
                        </div>
                      ) : agents.map(agent => (
                        <div key={agent._id} className="flex items-center justify-between p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5 group">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-purple-100 dark:bg-purple-500/20 rounded-full flex items-center justify-center">
                              <Mic className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-900 dark:text-white">{agent.name}</p>
                              <p className="text-xs text-slate-400 truncate w-40">{agent.systemPrompt?.substring(0, 60)}...</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                              {agent.knowledgeBase?.length || 0} files
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upcoming Meetings */}
                  <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/10 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Presentations</h3>
                      <button onClick={() => setActiveTab('meetings')} className="text-purple-500 hover:text-purple-400 text-sm transition-colors">View all →</button>
                    </div>
                    <div className="space-y-3">
                      {meetings.length === 0 ? (
                        <div className="text-center py-8">
                          <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-400 text-sm">No presentations scheduled.</p>
                        </div>
                      ) : meetings.slice(0, 3).map(m => (
                        <div key={m._id} className="p-3 bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5">
                          <div className="flex items-start justify-between">
                            <p className="font-semibold text-sm text-slate-900 dark:text-white">{m.topic}</p>
                            <BotStatusBadge status={botStatuses[m._id]} />
                          </div>
                          <p className="text-xs text-slate-400 mt-1">{new Date(m.scheduledStartTime).toLocaleString()} · {m.durationMinutes}m</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── MY AGENTS TAB ───────────────────────────── */}
            {activeTab === 'agents' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">My Presenter Agents</h3>
                  <button onClick={() => setShowCreateAgentModal(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all">
                    <Plus className="w-4 h-4" /> New Agent
                  </button>
                </div>

                {agents.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-10 h-10 text-purple-400" />
                    </div>
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Agents Yet</h4>
                    <p className="text-slate-400 mb-6">Create your first AI Presenter agent to get started.</p>
                    <button onClick={() => setShowCreateAgentModal(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2 transition-all">
                      <Plus className="w-4 h-4" /> Create First Agent
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map(agent => (
                      <div key={agent._id} className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/10 rounded-2xl p-5 group hover:border-purple-500/30 transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <Mic className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setEditAgent(agent)}
                              className="opacity-0 group-hover:opacity-100 text-blue-400 hover:text-blue-500 p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg transition-all" title="Edit Agent">
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteAgent(agent._id)}
                              className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 p-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg transition-all" title="Delete Agent">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-1">{agent.name}</h4>
                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{agent.systemPrompt}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-slate-400">
                            <FileText className="w-3 h-3" />
                            {agent.knowledgeBase?.length || 0} KB files
                          </span>
                          <span className="flex items-center gap-1 text-emerald-500">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        </div>
                        {agent.elevenLabsVoiceId && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/5">
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                              <Volume2 className="w-3 h-3" />
                              Voice ID: <span className="font-mono text-slate-500">{agent.elevenLabsVoiceId.substring(0, 12)}...</span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── KNOWLEDGE BASE TAB ──────────────────────── */}
            {activeTab === 'materials' && (
              <div>
                <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Knowledge Base</h3>
                    <p className="text-sm text-slate-400 mt-1">Upload PDFs or add text — the AI will use this content during presentations.</p>
                  </div>

                  {agents.length > 0 && (
                    <div className="flex flex-col gap-2 items-end">
                      <select
                        value={selectedAgentForKb}
                        onChange={e => setSelectedAgentForKb(e.target.value)}
                        className="bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                      >
                        {agents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectedAgentForKb ? setShowTextPromptModal(true) : toast.error('Select an agent.')}
                          disabled={!selectedAgentForKb}
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                          <Type className="w-4 h-4" /> Add Text
                        </button>
                        <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                        <button
                          onClick={() => selectedAgentForKb ? fileInputRef.current.click() : toast.error('Select an agent.')}
                          disabled={isUploading || !selectedAgentForKb}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                          {isUploading ? 'Uploading...' : 'Upload PDF'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {agents.length === 0 ? (
                  <div className="text-center py-16">
                    <Bot className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Create an agent first to manage its knowledge base.</p>
                  </div>
                ) : !selectedAgent ? (
                  <p className="text-slate-400">Select an agent above.</p>
                ) : (
                  <div>
                    {/* Info Banner */}
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-3">
                      <Zap className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <span className="font-semibold text-blue-700 dark:text-blue-400">AI Brain for: </span>
                        <span className="text-blue-600 dark:text-blue-300">{selectedAgent.name}</span>
                        <span className="text-blue-500 dark:text-blue-400"> — {selectedAgent.knowledgeBase?.length || 0} entries. PDF text is auto-extracted for Gemini.</span>
                      </div>
                    </div>

                    {/* KB Entries Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(!selectedAgent.knowledgeBase || selectedAgent.knowledgeBase.length === 0) ? (
                        <div className="col-span-3 text-center py-12">
                          <UploadCloud className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400 mb-1">No knowledge base entries yet.</p>
                          <p className="text-slate-500 text-sm">Upload a PDF or add text to get started.</p>
                        </div>
                      ) : selectedAgent.knowledgeBase.map((entry, index) => (
                        <div key={index} className="p-4 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 group hover:border-purple-300 dark:hover:border-purple-500/30 transition-all relative">
                          <button
                            onClick={() => handleDeleteKbEntry(selectedAgent._id, index, entry.fileName || 'entry')}
                            className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 p-1 bg-red-50 dark:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                          <div className="flex items-start gap-3">
                            {entry.fileType === 'text' ? (
                              <div className="w-9 h-9 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Type className="w-5 h-5 text-blue-500" />
                              </div>
                            ) : entry.fileType === 'pdf' ? (
                              <div className="w-9 h-9 bg-red-50 dark:bg-red-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-red-500" />
                              </div>
                            ) : (
                              <div className="w-9 h-9 bg-purple-50 dark:bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-purple-500" />
                              </div>
                            )}
                            <div className="overflow-hidden flex-1 pr-6">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {entry.fileName || (entry.fileType === 'text' ? 'Text Prompt' : 'Uploaded File')}
                              </p>
                              <p className="text-xs text-slate-400 uppercase mt-0.5">{entry.fileType}</p>
                              {entry.textData && (
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                  {entry.textData.substring(0, 100)}...
                                </p>
                              )}
                              {entry.fileType === 'pdf' && entry.textData && (
                                <span className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                                  <CheckCircle className="w-3 h-3" /> Text extracted ({entry.textData.length} chars)
                                </span>
                              )}
                              {entry.fileType === 'pdf' && !entry.textData && (
                                <span className="text-xs text-yellow-500 flex items-center gap-1 mt-1">
                                  <AlertCircle className="w-3 h-3" /> No text extracted
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PRESENTATIONS TAB ───────────────────────── */}
            {activeTab === 'meetings' && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Scheduled Presentations</h3>
                  <button
                    onClick={() => agents.length > 0 ? setShowScheduleModal(true) : toast.error('Create an agent first!')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.3)] transition-all"
                  >
                    <Video className="w-4 h-4" /> Schedule Zoom
                  </button>
                </div>

                {meetings.length === 0 ? (
                  <div className="text-center py-20">
                    <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Presentations Yet</h4>
                    <p className="text-slate-400 mb-6">Schedule a Zoom meeting to get started.</p>
                    <button
                      onClick={() => agents.length > 0 ? setShowScheduleModal(true) : toast.error('Create an agent first!')}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium inline-flex items-center gap-2 transition-all"
                    >
                      <Video className="w-4 h-4" /> Schedule First Presentation
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {meetings.map(meeting => {
                      const isStarting = startingBots[meeting._id];
                      const botStatus = botStatuses[meeting._id];
                      return (
                        <div key={meeting._id} className="p-5 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-100 dark:border-white/10 group hover:border-purple-300 dark:hover:border-purple-500/30 transition-all relative">
                          {/* Edit/Delete buttons */}
                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button onClick={() => setEditMeeting(meeting)} className="text-blue-500 p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteMeeting(meeting._id)} className="text-red-400 p-1.5 bg-red-50 dark:bg-red-500/10 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Meeting info */}
                          <h4 className="font-bold text-slate-900 dark:text-white text-base mb-2 pr-16">{meeting.topic}</h4>
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="px-2 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded border border-blue-200 dark:border-blue-500/20">
                              {new Date(meeting.scheduledStartTime).toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {meeting.durationMinutes} min
                            </span>
                            {meeting.agent && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Bot className="w-3 h-3" /> {meeting.agent.name || 'Unknown Agent'}
                              </span>
                            )}
                            <BotStatusBadge status={botStatus || meeting.status === 'completed' ? 'completed' : meeting.status === 'in_progress' ? 'speaking' : null} />
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-3">
                            <button
                              onClick={() => { navigator.clipboard.writeText(meeting.zoomJoinUrl || ''); toast.success('Join link copied!'); }}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs flex items-center gap-1 transition-colors"
                            >
                              <Link className="w-3.5 h-3.5" /> Copy Link
                            </button>
                            <div className="flex items-center gap-2">
                              {meeting.zoomStartUrl && (
                                <a
                                  href={meeting.zoomStartUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                                >
                                  <PlayCircle className="w-3.5 h-3.5" /> Host
                                </a>
                              )}
                              <button
                                onClick={() => handleStartBot(meeting)}
                                disabled={isStarting || meeting.status === 'completed'}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all disabled:opacity-60"
                              >
                                {isStarting
                                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Starting...</>
                                  : <><Bot className="w-3.5 h-3.5" /> Start Bot</>
                                }
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {showCreateAgentModal && (
        <CreateAgentModal
          onClose={() => setShowCreateAgentModal(false)}
          onCreated={fetchAgents}
        />
      )}

      {showScheduleModal && (
        <ScheduleModal
          agents={agents}
          onClose={() => setShowScheduleModal(false)}
          onScheduled={fetchMeetings}
        />
      )}

      {editMeeting && (
        <EditMeetingModal
          meeting={editMeeting}
          onClose={() => setEditMeeting(null)}
          onUpdated={fetchMeetings}
        />
      )}

      {showTextPromptModal && selectedAgentForKb && (
        <TextPromptModal
          agentId={selectedAgentForKb}
          onClose={() => setShowTextPromptModal(false)}
          onAdded={fetchAgents}
        />
      )}

      {/* ── Zoom Meeting Session Modal ─────────────────────── */}
      {activeMeetingSession && (
        <div className={isMeetingMinimized ? 'hidden' : 'block'}>
          <ZoomMeetingModal
            meeting={activeMeetingSession.meeting}
            sdkData={activeMeetingSession.sdkData}
            audioUrl={activeMeetingSession.audioUrl}
            meetingId={activeMeetingSession.meeting?._id}
            onClose={() => {
              setIsMeetingMinimized(false);
              handleModalClose();
            }}
            onComplete={() => handleModalComplete(activeMeetingSession.meeting?._id)}
            onMinimize={() => setIsMeetingMinimized(true)}
          />
        </div>
      )}

      {/* Floating Minimize Badge */}
      {activeMeetingSession && isMeetingMinimized && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsMeetingMinimized(false)}
            className="flex items-center gap-4 bg-[#1A1A24] border border-indigo-500/30 text-white px-6 py-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:scale-105 transition-transform group"
          >
            <div className="relative flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">🔴 AI is Live in Zoom</p>
              <p className="text-xs text-slate-400 mt-0.5">Click to view presentation</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
