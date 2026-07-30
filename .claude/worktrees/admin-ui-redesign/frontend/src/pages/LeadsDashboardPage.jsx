import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, Users, PhoneCall, Flame, MessageSquare, Search,
  Filter, ExternalLink, RefreshCw, ChevronLeft, ChevronRight,
  Zap, Target, Activity, Globe
} from 'lucide-react';
import { conversationAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

// ─── Platform Config ──────────────────────────────────────────────────────────
const PLATFORMS = [
  { key: '', label: 'All Platforms' },
  { key: 'whatsapp', label: 'WhatsApp', emoji: '📱', color: '#25D366', bg: 'rgba(37,211,102,0.15)', border: 'rgba(37,211,102,0.3)' },
  { key: 'telegram', label: 'Telegram', emoji: '✈️', color: '#229ED9', bg: 'rgba(34,158,217,0.15)', border: 'rgba(34,158,217,0.3)' },
  { key: 'instagram', label: 'Instagram', emoji: '📸', color: '#E1306C', bg: 'rgba(225,48,108,0.15)', border: 'rgba(225,48,108,0.3)' },
];

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'human_handoff', label: 'Wants Human' },
  { key: 'closed', label: 'Closed' },
];

// ─── Engagement Badge ─────────────────────────────────────────────────────────
const ENGAGEMENT_STYLES = {
  Hot:       { bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.4)',   text: '#f87171',  icon: '🔥' },
  Warm:      { bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  text: '#fbbf24',  icon: '♨️' },
  Interested:{ bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.4)',  text: '#60a5fa',  icon: '👀' },
  Cold:      { bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.4)', text: '#9ca3af', icon: '❄️' },
};

function EngagementBadge({ level }) {
  const s = ENGAGEMENT_STYLES[level] || ENGAGEMENT_STYLES.Cold;
  return (
    <span style={{
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.text,
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}>
      {s.icon} {level}
    </span>
  );
}

// ─── Interest Score Bar ───────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const [width, setWidth] = useState(0);
  const color = score >= 70 ? '#f87171' : score >= 40 ? '#fbbf24' : score >= 15 ? '#60a5fa' : '#6b7280';
  useEffect(() => { const t = setTimeout(() => setWidth(score), 120); return () => clearTimeout(t); }, [score]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{
          width: `${width}%`, height: '100%', borderRadius: 4,
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          boxShadow: `0 0 10px ${color}80`,
          transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 30, animation: 'fadeIn 0.5s ease' }}>{score}</span>
    </div>
  );
}

// ─── Platform Badge ───────────────────────────────────────────────────────────
function PlatformBadge({ platform }) {
  const p = PLATFORMS.find((x) => x.key === platform) || PLATFORMS[1];
  return (
    <span style={{
      background: p.bg,
      border: `1px solid ${p.border}`,
      color: p.color,
      padding: '2px 8px',
      borderRadius: '999px',
      fontSize: '10px',
      fontWeight: 700,
      textTransform: 'capitalize',
    }}>
      {p.emoji} {p.label || platform}
    </span>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
function AnimCounter({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (typeof value !== 'number') { setDisplay(value); return; }
    let start = 0; const end = value; const dur = 800;
    const step = Math.ceil(end / (dur / 16));
    const t = setInterval(() => {
      start += step;
      if (start >= end) { setDisplay(end); clearInterval(t); }
      else setDisplay(start);
    }, 16);
    return () => clearInterval(t);
  }, [value]);
  return <>{display}</>;
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ icon: Icon, label, value, sub, accent, glow, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent}22`,
      borderRadius: 16, padding: '20px 24px',
      backdropFilter: 'blur(12px)',
      boxShadow: glow ? `0 0 30px ${glow}15` : 'none',
      transition: 'transform 0.25s, box-shadow 0.25s, opacity 0.5s, transform 0.5s',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      cursor: 'default',
      position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'; e.currentTarget.style.boxShadow = `0 12px 40px ${glow}30`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.boxShadow = glow ? `0 0 30px ${glow}15` : 'none'; }}
    >
      {/* Glow orb */}
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${accent}12`, filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
        <div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</p>
          <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1, marginBottom: 6 }}>
            {visible ? <AnimCounter value={value} /> : '0'}
          </p>
          {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
        </div>
        <div style={{
          width: 46, height: 46, borderRadius: 13,
          background: `${accent}18`, border: `1px solid ${accent}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'iconPulse 3s ease-in-out infinite',
        }}>
          <Icon size={22} color={accent} />
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 140px 1fr 90px', gap: 12, alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      {[200, 80, 70, 120, 100, 60].map((w, i) => (
        <div key={i} style={{ height: 12, width: w, borderRadius: 6, background: 'rgba(255,255,255,0.06)', animation: `shimmer 1.5s ease-in-out ${i * 0.1}s infinite` }} />
      ))}
    </div>
  );
}

// ─── Lead Row ─────────────────────────────────────────────────────────────────
function LeadRow({ lead, onClick, index }) {
  const [visible, setVisible] = useState(false);
  const timeAgo = lead.lastMessageAt ? formatDistanceToNow(new Date(lead.lastMessageAt), { addSuffix: true }) : '—';
  useEffect(() => { const t = setTimeout(() => setVisible(true), index * 60); return () => clearTimeout(t); }, [index]);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 140px 1fr 90px',
        gap: 12, alignItems: 'center',
        padding: '14px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer',
        transition: 'background 0.2s, opacity 0.4s, transform 0.4s',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-16px)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.borderLeft = '2px solid rgba(99,102,241,0.4)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderLeft = 'none'; }}
    >
      {/* Name + last message */}
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #25D366, #128C7E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 13, color: '#fff',
          }}>
            {(lead.customerName || 'U')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.customerName}
              {lead.wantsHuman && (
                <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 999, padding: '1px 6px', fontWeight: 700 }}>
                  WANTS HUMAN
                </span>
              )}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lead.lastUserMessage || 'No messages yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Platform */}
      <div><PlatformBadge platform={lead.platform} /></div>

      {/* Engagement */}
      <div><EngagementBadge level={lead.engagementLevel} /></div>

      {/* Interest score bar */}
      <div><ScoreBar score={lead.interestScore} /></div>

      {/* Messages + time */}
      <div>
        <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 2 }}>💬 {lead.totalMessages} messages</p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{timeAgo}</p>
      </div>

      {/* Keywords */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {lead.matchedKeywords.slice(0, 2).map((kw) => (
          <span key={kw} style={{
            fontSize: 9, padding: '1px 5px', borderRadius: 4,
            background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
            border: '1px solid rgba(99,102,241,0.25)',
          }}>
            {kw}
          </span>
        ))}
        {lead.matchedKeywords.length > 2 && (
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>+{lead.matchedKeywords.length - 2}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LeadsDashboardPage() {
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await conversationAPI.getLeads({
        platform: platform || undefined,
        status: status || undefined,
        search: search || undefined,
        page,
        limit: 20,
      });
      setLeads(res.data.data.leads);
      setSummary(res.data.data.summary);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load leads data');
    } finally {
      setLoading(false);
    }
  }, [platform, status, search, page]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const platformBreakdown = summary?.platformBreakdown || [];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #07091a 0%, #0d1a2e 50%, #07091a 100%)',
      padding: '24px',
      fontFamily: "'Manrope', -apple-system, sans-serif",
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Floating background orbs */}
      <div style={{ position: 'fixed', top: '10%', left: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none', animation: 'floatOrb 8s ease-in-out infinite' }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '8%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(248,113,113,0.07) 0%, transparent 70%)', pointerEvents: 'none', animation: 'floatOrb 10s ease-in-out 2s infinite reverse' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.05) 0%, transparent 70%)', pointerEvents: 'none', animation: 'floatOrb 12s ease-in-out 4s infinite' }} />
      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'linear-gradient(135deg, #FF6A00, #F59E0B)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(255,106,0,0.35)',
              }}>
                <Target size={20} color="#fff" />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em' }}>
                Lead Intelligence
              </h1>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginLeft: 52 }}>
              Track who's interested, which platform they're from, and who needs a human
            </p>
          </div>
          <button
            onClick={fetchLeads}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#94a3b8', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        <SummaryCard icon={Users} label="Total Leads" value={summary?.totalLeads ?? 0} sub="All conversations" accent="#6366f1" glow="#6366f1" delay={0} />
        <SummaryCard icon={Flame} label="Hot Leads" value={summary?.hotLeads ?? 0} sub="High engagement" accent="#f87171" glow="#f87171" delay={100} />
        <SummaryCard icon={PhoneCall} label="Want Human" value={summary?.wantHuman ?? 0} sub="Requested agent" accent="#fbbf24" glow="#fbbf24" delay={200} />
        <SummaryCard icon={Activity} label="Showing" value={total} sub="In current filter" accent="#34d399" glow="#34d399" delay={300} />
      </div>

      {/* ── Platform Breakdown ── */}
      {platformBreakdown.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16, padding: '16px 20px',
          marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={14} color="#FF6A00" />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source</span>
          </div>
          {platformBreakdown.map((pb) => {
            const p = PLATFORMS.find((x) => x.key === pb.platform) || { label: pb.platform, emoji: '📲', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };
            const pct = summary?.totalLeads ? Math.round((pb.count / summary.totalLeads) * 100) : 0;
            return (
              <div key={pb.platform} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  background: p.bg, border: `1px solid ${p.border}`,
                  borderRadius: 8, padding: '6px 12px',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 14 }}>{p.emoji}</span>
                  <span style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>{p.label}</span>
                  <span style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.6)',
                    background: 'rgba(0,0,0,0.2)', borderRadius: 999,
                    padding: '1px 6px', fontWeight: 600,
                  }}>{pb.count} ({pct}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
        marginBottom: 20,
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, phone..."
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, color: '#f1f5f9', fontSize: 13, outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Platform filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {PLATFORMS.map((p) => (
            <button
              key={p.key}
              onClick={() => { setPlatform(p.key); setPage(1); }}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: platform === p.key ? 'rgba(255,106,0,0.22)' : 'rgba(255,255,255,0.04)',
                border: platform === p.key ? '1px solid rgba(255,106,0,0.5)' : '1px solid rgba(255,255,255,0.08)',
                color: platform === p.key ? '#fdba74' : '#94a3b8',
              }}
            >
              {p.emoji ? `${p.emoji} ` : ''}{p.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.key}
              onClick={() => { setStatus(s.key); setPage(1); }}
              style={{
                padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                background: status === s.key ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.04)',
                border: status === s.key ? '1px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: status === s.key ? '#fbbf24' : '#94a3b8',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, overflow: 'hidden',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 140px 1fr 90px',
          gap: 12, padding: '12px 20px',
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          {['Lead', 'Platform', 'Engagement', 'Interest Score', 'Activity', 'Keywords'].map((h) => (
            <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div>
            {[...Array(6)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <TrendingUp size={40} style={{ color: 'rgba(255,255,255,0.1)', marginBottom: 12 }} />
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 500 }}>No leads found</p>
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 4 }}>Try adjusting your filters</p>
          </div>
        ) : (
          leads.map((lead, i) => (
            <LeadRow
              key={lead._id}
              lead={lead}
              index={i}
              onClick={() => navigate(`/app/conversations?conv=${lead._id}`)}
            />
          ))
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Page {page} of {totalPages} · {total} leads
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: page === 1 ? 'rgba(255,255,255,0.2)' : '#94a3b8',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '6px 12px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: page === totalPages ? 'rgba(255,255,255,0.2)' : '#94a3b8',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div style={{ marginTop: 20, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {Object.entries(ENGAGEMENT_STYLES).map(([level, s]) => (
          <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{s.icon}</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{level}:</span>
            <span style={{ fontSize: 11, color: s.text }}>
              {level === 'Hot' ? 'Score ≥ 70' : level === 'Warm' ? '40–69' : level === 'Interested' ? '15–39' : '< 15'}
            </span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
          Click any row to open the conversation →
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes floatOrb { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(20px,-15px) scale(1.05); } 66% { transform: translate(-10px,20px) scale(0.97); } }
        @keyframes iconPulse { 0%,100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 16px 4px rgba(255,255,255,0.07); } }
        @keyframes shimmer {
          0% { background: rgba(255,255,255,0.05); }
          50% { background: rgba(255,255,255,0.12); }
          100% { background: rgba(255,255,255,0.05); }
        }
        input::placeholder { color: rgba(255,255,255,0.25); }
        input:focus { border-color: rgba(255,106,0,0.5) !important; box-shadow: 0 0 0 3px rgba(255,106,0,0.12); }
      `}</style>
    </div>
  );
}
