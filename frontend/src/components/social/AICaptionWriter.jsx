import React, { useState } from 'react';
import { Sparkles, Loader2, Copy, Check, RefreshCw, ChevronDown } from 'lucide-react';
import { socialHubAPI } from '../../services/api';
import toast from 'react-hot-toast';

const PLATFORMS = ['instagram', 'facebook', 'linkedin', 'youtube', 'telegram'];
const GENRES = [
  { id: 'product', label: '🛍️ Product Showcase' },
  { id: 'event', label: '📅 Event Announcement' },
  { id: 'motivational', label: '🔥 Motivational' },
  { id: 'question', label: '❓ Engagement Question' },
  { id: 'story', label: '📖 Personal Story' },
  { id: 'promotional', label: '📣 Promotional' },
  { id: 'educational', label: '📚 Educational' },
  { id: 'behind_scenes', label: '🎬 Behind the Scenes' },
];
const TONES = [
  { id: 'casual', label: '😊 Casual & Friendly' },
  { id: 'professional', label: '💼 Professional' },
  { id: 'humorous', label: '😄 Witty & Humorous' },
  { id: 'urgent', label: '⚡ Urgent / FOMO' },
  { id: 'inspirational', label: '✨ Inspirational' },
];

export default function AICaptionWriter({ isDark, selectedPlatforms = [], onApply }) {
  const [platform, setPlatform] = useState(selectedPlatforms[0] || 'instagram');
  const [genre, setGenre] = useState('product');
  const [tone, setTone] = useState('casual');
  const [context, setContext] = useState('');
  const [brandName, setBrandName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await socialHubAPI.generateCaption({ platform, genre, tone, context: context.trim(), brandName: brandName.trim() });
      setResult(res.data.data);
    } catch (err) {
      toast.error('Caption generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!result?.caption) return;
    navigator.clipboard.writeText(result.caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Caption copied!');
  };

  const handleApply = () => {
    if (!result?.caption || !onApply) return;
    onApply(result.caption);
    toast.success('Caption applied to post!');
  };

  const inputCls = `w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-all ${
    isDark ? 'bg-slate-950 border-white/10 text-slate-100 placeholder:text-slate-500 focus:ring-violet-500/30' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-violet-300'
  }`;
  const selectCls = `w-full rounded-xl border px-3 py-2 text-sm focus:outline-none transition-all ${
    isDark ? 'bg-slate-950 border-white/10 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
  }`;

  return (
    <div className={`rounded-2xl border p-5 space-y-4 transition-all ${isDark ? 'bg-gradient-to-br from-violet-950/40 to-slate-900 border-violet-500/20' : 'bg-gradient-to-br from-violet-50 to-white border-violet-200'}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
          <Sparkles size={18} className="text-violet-500" />
        </div>
        <div>
          <h3 className={`font-semibold text-sm ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>AI Caption Writer</h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Generate platform-optimized captions instantly</p>
        </div>
      </div>

      {/* Platform */}
      <div>
        <label className={`block text-xs font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Platform</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                platform === p
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : (isDark ? 'bg-white/5 text-slate-400 hover:bg-white/10' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Genre + Tone row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Content Type</label>
          <select value={genre} onChange={e => setGenre(e.target.value)} className={selectCls}>
            {GENRES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </div>
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Tone</label>
          <select value={tone} onChange={e => setTone(e.target.value)} className={selectCls}>
            {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
      </div>

      {/* Context */}
      <div>
        <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>What's this post about? <span className="font-normal opacity-60">(optional)</span></label>
        <textarea
          value={context}
          onChange={e => setContext(e.target.value)}
          placeholder="e.g. New product launch, summer sale 50% off, yoga event on Sunday..."
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>

      {/* Advanced Options */}
      <button
        type="button"
        onClick={() => setShowAdvanced(v => !v)}
        className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <ChevronDown size={13} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        Advanced options
      </button>

      {showAdvanced && (
        <div>
          <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Brand / Business Name</label>
          <input
            type="text"
            value={brandName}
            onChange={e => setBrandName(e.target.value)}
            placeholder="e.g. ZenFit Studio, TechNova..."
            className={`${inputCls} h-9`}
          />
        </div>
      )}

      {/* Generate Button */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20"
      >
        {generating ? (
          <><Loader2 size={16} className="animate-spin" /> Generating with AI...</>
        ) : (
          <><Sparkles size={16} /> Generate Caption</>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${isDark ? 'bg-slate-950/80 border-violet-500/20' : 'bg-violet-50/80 border-violet-200'}`}>
          {/* Hook badge */}
          {result.hook && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${isDark ? 'bg-violet-500/20 text-violet-300' : 'bg-violet-100 text-violet-700'}`}>
              <Sparkles size={10} />
              HOOK: {result.hook}
            </div>
          )}

          {/* Caption text */}
          <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {result.caption}
          </p>

          {/* Char count */}
          <div className={`flex items-center justify-between text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            <span>{result.charCount} characters</span>
            {result.callToAction && (
              <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'}`}>
                CTA: {result.callToAction}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleApply}
              className="flex-1 h-9 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all"
            >
              ✓ Use This Caption
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${
                copied ? 'bg-green-500 border-green-500 text-white' : (isDark ? 'border-white/10 hover:bg-white/5 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600')
              }`}
              title="Copy caption"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className={`h-9 w-9 rounded-lg border flex items-center justify-center transition-all ${isDark ? 'border-white/10 hover:bg-white/5 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'}`}
              title="Regenerate"
            >
              <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
