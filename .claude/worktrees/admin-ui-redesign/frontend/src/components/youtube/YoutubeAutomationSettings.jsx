import React, { useEffect, useState, useCallback } from 'react';
import {
  Youtube, Info, MessageSquare, RefreshCw,
  Loader2, Link2, Unlink, CheckCircle2, AlertCircle, ExternalLink
} from 'lucide-react';
import { youtubeAPI } from '../../services/api';
import toast from 'react-hot-toast';

// ─── YouTube Connect Card ─────────────────────────────────────────────────────
function YoutubeConnectCard({ onConnected }) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await youtubeAPI.getAuthUrl();
      const authUrl = res.data.url;
      if (!authUrl) throw new Error('No auth URL returned');

      // Open Google OAuth in a popup
      const width = 500, height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        authUrl,
        'youtube_oauth',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
      );

      // Listen for the OAuth callback (code in URL)
      const timer = setInterval(async () => {
        try {
          if (!popup || popup.closed) {
            clearInterval(timer);
            setConnecting(false);
            return;
          }
          const popupUrl = popup.location.href;
          if (popupUrl.includes('code=')) {
            clearInterval(timer);
            const code = new URL(popupUrl).searchParams.get('code');
            popup.close();
            // Exchange code for token
            const callbackRes = await youtubeAPI.callback(code);
            toast.success(`✅ ${callbackRes.data.data?.channelName || 'YouTube'} connected!`);
            onConnected(callbackRes.data.data);
            setConnecting(false);
          }
        } catch {
          // Cross-origin restriction while popup is on Google domain — keep polling
        }
      }, 500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start YouTube connect');
      setConnecting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
      <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
        <Youtube size={40} className="text-[#FF0000]" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Connect YouTube Channel</h3>
      <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
        Connect your YouTube channel to enable AI-powered comment automation and analytics.
      </p>
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="inline-flex items-center gap-3 bg-[#FF0000] hover:bg-red-600 text-white font-semibold px-8 py-3.5 rounded-2xl transition-all disabled:opacity-70 shadow-lg shadow-red-200"
      >
        {connecting ? (
          <><Loader2 size={20} className="animate-spin" /> Connecting...</>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            Connect with Google
          </>
        )}
      </button>
      <p className="text-xs text-gray-400 mt-4">
        You'll be redirected to Google to grant YouTube access
      </p>
    </div>
  );
}

// ─── Connected Channel Card ───────────────────────────────────────────────────
function ConnectedChannelCard({ channel, onDisconnect }) {
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect this YouTube channel? Automation will stop.')) return;
    setDisconnecting(true);
    try {
      await youtubeAPI.disconnect();
      toast.success('YouTube channel disconnected');
      onDisconnect();
    } catch {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center shrink-0">
            <Youtube size={28} className="text-[#FF0000]" />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-lg">
              {channel?.channelName || 'YouTube Channel'}
            </p>
            <p className="text-sm text-gray-500 font-mono">
              {channel?.channelId}
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-green-500" />
              <span className="text-xs font-semibold text-green-600">Connected</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {disconnecting ? <Loader2 size={15} className="animate-spin" /> : <Unlink size={15} />}
          Disconnect
        </button>
      </div>
    </div>
  );
}

// ─── Automation Settings ──────────────────────────────────────────────────────
function AutomationSettings() {
  const [settings, setSettings] = useState({
    enabled: false,
    automationMode: 'manual',
    aiPrompt: 'You are a helpful YouTube creator. Reply to this comment in a friendly and engaging way. Keep it short and encourage the viewer.'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await youtubeAPI.getAutomationSettings();
        if (res.data?.data) setSettings(res.data.data);
      } catch {
        toast.error('Failed to load automation settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await youtubeAPI.updateAutomationSettings(settings);
      if (res.data?.data) setSettings(res.data.data);
      toast.success('Settings saved!');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <Loader2 size={24} className="animate-spin text-red-500" />
    </div>
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-gray-900">Comment AI Automation</h3>
          <p className="text-sm text-gray-500 mt-0.5">Configure how AI replies to comments</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500">
            {settings.enabled ? 'Enabled' : 'Disabled'}
          </span>
          <button
            onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none
              ${settings.enabled ? 'bg-[#FF0000]' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Reply Mode */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
            Reply Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1 bg-gray-100 rounded-2xl">
            {[
              { value: 'auto', icon: RefreshCw, label: 'Fully Automatic' },
              { value: 'manual', icon: MessageSquare, label: 'Manual Approval' },
            ].map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setSettings(prev => ({ ...prev, automationMode: value }))}
                className={`flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl transition
                  ${settings.automationMode === value
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'}`}
              >
                <Icon size={16} className={settings.automationMode === value ? 'text-[#FF0000]' : ''} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Prompt */}
        <div>
          <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
            AI Personality & Tone
          </label>
          <textarea
            value={settings.aiPrompt}
            onChange={(e) => setSettings(prev => ({ ...prev, aiPrompt: e.target.value }))}
            className="w-full h-36 p-4 text-sm border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-100 focus:border-red-300 outline-none resize-none transition-all"
            placeholder="Give instructions to the AI on how to reply to comments..."
          />
        </div>

        <div className="flex items-start gap-3 bg-blue-50 rounded-xl p-4">
          <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            AI replies ki history aur pending queue dekhne ke liye sidebar mein <strong>Automation Hub</strong> par jayein.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 bg-gray-900 text-white rounded-2xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function YoutubeAutomationSettings() {
  const [channel, setChannel] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'connected' | 'disconnected'

  const checkConnection = useCallback(async () => {
    try {
      const res = await youtubeAPI.getAutomationSettings();
      const data = res.data?.data;
      if (data?.isConnected) {
        setChannel({ channelId: data.channelId, channelName: data.channelName });
        setStatus('connected');
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    // Check if we're returning from OAuth (code in URL hash/query)
    const params = new URLSearchParams(window.location.search);
    const code = params.get('yt_code') || params.get('code');
    if (code && window.location.pathname.includes('integrations')) {
      youtubeAPI.callback(code).then(res => {
        toast.success(`YouTube connected: ${res.data.data?.channelName}`);
        setChannel(res.data.data);
        setStatus('connected');
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }).catch(() => setStatus('disconnected'));
    } else {
      checkConnection();
    }
  }, [checkConnection]);

  const handleConnected = (data) => {
    setChannel(data);
    setStatus('connected');
  };

  const handleDisconnected = () => {
    setChannel(null);
    setStatus('disconnected');
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 size={28} className="animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">YouTube Integration</h2>
          <p className="text-gray-500 text-sm mt-1">
            Connect your channel and configure AI comment automation
          </p>
        </div>
        {status === 'connected' && (
          <a
            href="https://studio.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#FF0000] transition-colors"
          >
            <ExternalLink size={14} />
            YouTube Studio
          </a>
        )}
      </div>

      {status === 'disconnected' ? (
        <YoutubeConnectCard onConnected={handleConnected} />
      ) : (
        <>
          <ConnectedChannelCard channel={channel} onDisconnect={handleDisconnected} />
          <AutomationSettings />
        </>
      )}
    </div>
  );
}
