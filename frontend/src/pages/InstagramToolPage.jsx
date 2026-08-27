import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Instagram, 
  Search, 
  Send, 
  MessageCircle, 
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  ChevronRight,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Cpu,
  BarChart3,
  Bot
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { getSocket } from '../utils/socket';

export default function InstagramTool() {
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [mediaItems, setMediaItems] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  
  const [selectedComment, setSelectedComment] = useState(null); // If null, we comment on media. If set, we reply to comment.
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Stats & Progress
  const [accountStats, setAccountStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [autoReplyProgress, setAutoReplyProgress] = useState(null); // { status, processed, total }
  
  // Post Automation Modal State
  const [showAutoReplyModal, setShowAutoReplyModal] = useState(false);
  const [autoReplyConfig, setAutoReplyConfig] = useState({
    triggerType: 'ALL_COMMENTS',
    keywords: '',
    dmMessage: '',
    commentReply: '',
    isActive: true,
    hasButton: false,
    buttonText: '',
    buttonNextMessage: '',
    buttonNextLink: ''
  });
  const [loadingAutoReply, setLoadingAutoReply] = useState(false);
  const [savingAutoReply, setSavingAutoReply] = useState(false);

  const socketRef = useRef(null);

  const selectedMediaRef = useRef(null);
  useEffect(() => {
    selectedMediaRef.current = selectedMedia;
  }, [selectedMedia]);

  const selectedAccountRef = useRef(null);
  useEffect(() => {
    selectedAccountRef.current = selectedAccount;
  }, [selectedAccount]);

  // Initialize Socket
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const handleProgress = (data) => {
      // data: { mediaId, processed, total, status }
      const currentMedia = selectedMediaRef.current;
      const currentAccount = selectedAccountRef.current;
      if (currentMedia && currentAccount && data.mediaId === currentMedia.id) {
        setAutoReplyProgress(data);
        if (data.status === 'completed') {
          setTimeout(() => {
            setAutoReplyProgress(null);
            fetchComments(currentMedia, currentAccount, true); // refresh to see AI replies silently
          }, 2000);
        }
      }
    };

    const handleNewComment = (data) => {
      console.log('[Socket] new_instagram_comment received:', data);
      const currentMedia = selectedMediaRef.current;
      const currentAccount = selectedAccountRef.current;
      // Meta webhook mediaId sometimes corresponds to a child carousel item, 
      // which won't match the parent currentMedia.id. Rely on accountId match instead.
      if (currentMedia && currentAccount && String(data.accountId) === String(currentAccount._id)) {
        console.log('[Socket] Refreshing comments for media silently:', currentMedia.id);
        fetchComments(currentMedia, currentAccount, true); // true = silent refresh
      }
    };

    socket.on('ig_auto_reply_progress', handleProgress);
    socket.on('new_instagram_comment', handleNewComment);

    return () => {
      socket.off('ig_auto_reply_progress', handleProgress);
      socket.off('new_instagram_comment', handleNewComment);
    };
  }, []);

  // Auto-poll comments every 10 seconds when a post is selected (live refresh)
  useEffect(() => {
    if (!selectedMedia || !selectedAccount) return;

    const interval = setInterval(() => {
      fetchComments(selectedMedia, selectedAccount, true); // silent refresh
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedMedia, selectedAccount]);

  // Fetch Accounts on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      // JWT via cookies
      const res = await api.get(`/instagram/manual/accounts`);
      const fetchedAccounts = res.data.data.accounts || [];
      setAccounts(fetchedAccounts);
      if (fetchedAccounts.length > 0) {
        fetchMedia(fetchedAccounts[0]);
      }
    } catch (err) {
      toast.error('Failed to load Instagram accounts');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchMedia = async (account) => {
    setSelectedAccount(account);
    setSelectedMedia(null);
    setComments([]);
    setAccountStats(null);
    setAutoReplyProgress(null);
    setLoadingMedia(true);
    setLoadingStats(true);
    
    try {
      // JWT via cookies
      // Fetch stats in parallel
      api.get(`/instagram/manual/${account._id}/stats`).then(res => {
        setAccountStats(res.data.data);
      }).catch(err => console.error("Failed stats:", err))
      .finally(() => setLoadingStats(false));

      const res = await api.get(`/instagram/manual/${account._id}/media`);
      setMediaItems(res.data.data.media || []);
    } catch (err) {
      toast.error('Failed to fetch media for this account');
    } finally {
      setLoadingMedia(false);
    }
  };

  const fetchComments = async (media, accountOverride = null, isSilent = false) => {
    const accountToUse = accountOverride || selectedAccount;
    
    if (!isSilent) {
      setSelectedMedia(media);
      setSelectedComment(null);
      setAutoReplyProgress(null);
      setLoadingComments(true);
    }
    
    try {
      // JWT via cookies
      const res = await api.get(`/instagram/manual/${accountToUse._id}/media/${media.id}/comments`);
      const fetchedComments = res.data.data.comments || [];
      const sortedComments = [...fetchedComments].sort((a, b) => new Date(b.timestamp || b.createdAt || b.created_time) - new Date(a.timestamp || a.createdAt || a.created_time));
      setComments(sortedComments);
    } catch (err) {
      if (!isSilent) toast.error('Failed to fetch comments for this post');
    } finally {
      if (!isSilent) setLoadingComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!messageText.trim()) {
      return toast.error("Please enter a message");
    }

    setIsSending(true);
    try {
      // JWT via cookies
      const targetId = selectedComment ? selectedComment.id : selectedMedia.id;
      const type = selectedComment ? 'comment' : 'media';

      await api.post(`/instagram/manual/comment`, {
        accountId: selectedAccount._id,
        targetId,
        type,
        text: messageText
      });
      
      toast.success(type === 'comment' ? 'Reply sent successfully!' : 'Comment posted successfully!');
      setMessageText('');
      
      // Refresh comments
      if (selectedMedia) {
        fetchComments(selectedMedia);
      }
    } catch (err) {
      toast.error('Failed to send comment');
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleBot = async () => {
    if (!selectedAccount) return;
    const newState = !selectedAccount.commentBotEnabled;
    try {
      // JWT via cookies
      await api.patch(`/instagram/${selectedAccount._id}/bot`, { commentBotEnabled: newState });
      setSelectedAccount({ ...selectedAccount, commentBotEnabled: newState });
      setAccounts(accounts.map(acc => acc._id === selectedAccount._id ? { ...acc, commentBotEnabled: newState } : acc));
      toast.success(newState ? 'Comment Bot Enabled!' : 'Comment Bot Disabled!');
    } catch (err) {
      toast.error('Failed to update bot settings');
    }
  };

  const fetchPostAutomation = async () => {
    if (!selectedMedia || !selectedAccount) return;
    setLoadingAutoReply(true);
    try {
      const res = await api.get(`/post-automations/instagram/${selectedAccount._id}/${selectedMedia.id}`);
      if (res.data.data) {
        setAutoReplyConfig({
          ...res.data.data,
          keywords: res.data.data.keywords ? res.data.data.keywords.join(', ') : ''
        });
      } else {
        setAutoReplyConfig({
          triggerType: 'ALL_COMMENTS',
          keywords: '',
          dmMessage: '',
          commentReply: '',
          isActive: true,
          hasButton: false,
          buttonText: '',
          buttonNextMessage: '',
          buttonNextLink: ''
        });
      }
      setShowAutoReplyModal(true);
    } catch (err) {
      toast.error('Failed to fetch post automation config');
    } finally {
      setLoadingAutoReply(false);
    }
  };

  const savePostAutomation = async () => {
    if (!autoReplyConfig.dmMessage || !autoReplyConfig.commentReply) {
      return toast.error('DM message and comment reply are required.');
    }
    setSavingAutoReply(true);
    try {
      await api.post(`/post-automations`, {
        platform: 'instagram',
        accountId: selectedAccount._id,
        mediaId: selectedMedia.id,
        triggerType: autoReplyConfig.triggerType,
        keywords: autoReplyConfig.keywords.split(',').map(k => k.trim()).filter(k => k),
        dmMessage: autoReplyConfig.dmMessage,
        commentReply: autoReplyConfig.commentReply,
        isActive: autoReplyConfig.isActive,
        hasButton: autoReplyConfig.hasButton,
        buttonText: autoReplyConfig.buttonText,
        buttonNextMessage: autoReplyConfig.buttonNextMessage,
        buttonNextLink: autoReplyConfig.buttonNextLink
      });
      toast.success('Post automation saved successfully');
      setShowAutoReplyModal(false);
    } catch (err) {
      toast.error('Failed to save post automation config');
    } finally {
      setSavingAutoReply(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-6 h-full min-h-0">
      
      {/* HEADER: Active Account Info */}
      {selectedAccount && (
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-pink-500/20 rounded-xl">
              <Instagram className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-gray-100">@{selectedAccount.igUsername || 'Unknown'}</h2>
              <div className="text-sm text-slate-500 dark:text-gray-400 flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                {selectedAccount.user?.name || 'No User'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                try {
                  // JWT via cookies
                  await api.post(`/instagram/manual/trigger-worker`, {});
                  toast.success('Sync started in background');
                } catch(e) {
                  toast.error('Failed to start sync');
                }
              }} 
              title="Force Sync Unanswered DMs"
              className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl transition-colors font-bold flex items-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" /> Sync DMs
            </button>
            <button onClick={fetchAccounts} className="p-2 bg-slate-100 dark:bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-slate-500 dark:text-gray-400">
              <RefreshCw className={`w-5 h-5 ${loadingAccounts ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {loadingAccounts && !selectedAccount ? (
        <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-pink-500" /></div>
      ) : !selectedAccount ? (
        <div className="flex-1 flex justify-center items-center text-slate-400 dark:text-gray-500">No connected accounts found. Connect an account first.</div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 relative">
          
          {/* COLUMN 1: Media Posts & Stats */}
          <div className={`w-full lg:w-1/3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl flex-col overflow-hidden shrink-0 h-full lg:h-auto ${selectedMedia ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-white/10 shrink-0">
          <h2 className="font-bold flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-500" />
            Recent Posts
          </h2>
        </div>
        
        {/* Stats Section */}
        {selectedAccount && (
          <div className="p-3 bg-slate-100 dark:bg-black/20 border-b border-slate-200 dark:border-white/5 text-sm">
            <h3 className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-gray-300 mb-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Page Analytics (Top 20 Posts)
            </h3>
            {loadingStats ? (
              <div className="text-slate-400 dark:text-gray-500 text-xs animate-pulse">Calculating...</div>
            ) : accountStats ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg text-center">
                  <div className="text-slate-500 dark:text-gray-400">Total Comments</div>
                  <div className="font-bold text-slate-800 dark:text-gray-200">{accountStats.totalComments}</div>
                </div>
                <div className="bg-slate-50 dark:bg-white/5 p-2 rounded-lg text-center">
                  <div className="text-slate-500 dark:text-gray-400">Pending Replies</div>
                  <div className="font-bold text-rose-400">{accountStats.pendingComments}</div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 dark:text-gray-500 text-xs">No stats available</div>
            )}
            
            {/* BOT TOGGLE */}
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className={`w-4 h-4 ${selectedAccount.commentBotEnabled ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className="text-xs font-bold text-slate-700 dark:text-gray-300">Auto-Reply Bot</span>
              </div>
              <button 
                onClick={handleToggleBot}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${selectedAccount.commentBotEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${selectedAccount.commentBotEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
            </div>
            
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
          {!selectedAccount ? (
            <div className="text-center text-slate-400 dark:text-gray-500 text-sm py-8">Select an account to view posts.</div>
          ) : loadingMedia ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
          ) : mediaItems.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-gray-500 text-sm py-8">No posts found for this account.</div>
          ) : (
            mediaItems.map(media => (
              <button
                key={media.id}
                onClick={() => fetchComments(media)}
                className={`w-full text-left p-2 rounded-xl border transition-all flex gap-3 ${
                  selectedMedia?.id === media.id 
                    ? 'bg-purple-500/20 border-purple-500/50' 
                    : 'bg-slate-50 dark:bg-white/5 border-transparent hover:bg-slate-100 dark:bg-white/10'
                }`}
              >
                <img 
                  src={media.thumbnail_url || media.media_url || 'https://via.placeholder.com/150'} 
                  alt="Post" 
                  className="w-16 h-16 object-cover rounded-lg shrink-0 bg-slate-200 dark:bg-black/40"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500 dark:text-gray-400 capitalize mb-1">{media.media_type}</div>
                  <div className="text-sm text-slate-800 dark:text-gray-200 line-clamp-2 leading-tight">
                    {media.caption || 'No caption'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 3: Comments & Composer */}
      <div className={`flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl flex-col overflow-hidden relative h-full lg:h-auto ${!selectedMedia ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-white/10 shrink-0 flex justify-between items-center bg-white/50 dark:bg-black/20 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSelectedMedia(null)}
              className="lg:hidden p-1.5 -ml-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 dark:text-gray-400"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            <h2 className="font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <span className="hidden sm:inline">Comments & Replies</span>
              <span className="sm:hidden">Comments</span>
            </h2>
          </div>
          {selectedMedia && (
            <div className="flex gap-2">
              <button
                onClick={fetchPostAutomation}
                disabled={loadingAutoReply}
                className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              >
                {loadingAutoReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '⚡ Set Auto-DM'}
              </button>
              <button
                onClick={async () => {
                  try {
                    // JWT via cookies
                    await api.post(`/instagram/manual/auto-reply-post`, {
                      accountId: selectedAccount._id,
                      mediaId: selectedMedia.id
                    });
                    toast.success('AI is replying to all unanswered comments in background!');
                  } catch(e) {
                    toast.error('Failed to start AI Auto-Reply');
                  }
                }}
                className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2"
              >
                <Cpu className="w-3.5 h-3.5" /> AI Auto-Reply All
              </button>
            </div>
          )}
        </div>
        
        {autoReplyProgress && (
          <div className="bg-purple-500/10 border-b border-purple-500/20 p-3 shrink-0">
            <div className="flex justify-between text-xs text-purple-300 mb-1">
              <span>{autoReplyProgress.status === 'completed' ? 'Completed!' : 'AI Processing Comments...'}</span>
              <span>{autoReplyProgress.processed} / {autoReplyProgress.total}</span>
            </div>
            <div className="w-full bg-black/50 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-purple-500 h-1.5 transition-all duration-300" 
                style={{ width: `${autoReplyProgress.total > 0 ? (autoReplyProgress.processed / autoReplyProgress.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-32">
          {!selectedMedia ? (
            <div className="text-center text-slate-400 dark:text-gray-500 text-sm py-8 h-full flex flex-col items-center justify-center">
              <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
              Select a post to view its comments and send replies.
            </div>
          ) : loadingComments ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : comments.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-gray-500 text-sm py-8">No comments on this post yet.</div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="space-y-2">
                <div 
                  onClick={() => setSelectedComment(comment)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedComment?.id === comment.id 
                      ? 'bg-blue-500/20 border-blue-500/50' 
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-800 dark:text-gray-200">@{comment.username}</span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500">{new Date(comment.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-gray-300">{comment.text}</p>
                </div>
                
                {/* Replies */}
                {comment.replies && comment.replies.data && comment.replies.data.map(reply => (
                  <div key={reply.id} className="ml-8 p-3 rounded-xl bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-blue-400">@{reply.username}</span>
                      <span className="text-[10px] text-slate-400 dark:text-gray-500">{new Date(reply.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-gray-300">{reply.text}</p>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Composer Footer */}
        {selectedMedia && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#0d1117] border-t border-slate-200 dark:border-white/10 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-gray-400">
                {selectedComment ? (
                  <span className="flex items-center gap-1 text-blue-400">
                    Replying to @{selectedComment.username}
                    <button onClick={() => setSelectedComment(null)} className="ml-2 text-rose-400 hover:text-rose-300">Cancel</button>
                  </span>
                ) : (
                  <span className="text-purple-400">Commenting on Post</span>
                )}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type your message..."
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleSendComment}
                disabled={isSending || !messageText.trim()}
                className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-slate-800 dark:text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center transition-all"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      </div>
      )}

      {/* AUTO-REPLY MODAL (Visual Flow Builder) */}
      {showAutoReplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-50 dark:bg-[#0f172a] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative border border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-[#1e293b] rounded-t-2xl">
              <div>
                <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <Bot className="w-7 h-7 text-[#FF6A00]" />
                  Instagram Flow Builder
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Visually configure auto-replies and follow-up actions for your post.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Active</span>
                <button 
                  onClick={() => setAutoReplyConfig({ ...autoReplyConfig, isActive: !autoReplyConfig.isActive })}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${autoReplyConfig.isActive ? 'bg-[#FF6A00]' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${autoReplyConfig.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Flow Builder Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
              
              {/* STEP 1 */}
              <div className="relative pl-8">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-700 translate-x-[11px] translate-y-8"></div>
                <div className="absolute left-0 top-4 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-slate-50 dark:border-[#0f172a] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-500 dark:bg-slate-400"></div>
                </div>
                
                <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-xs">Step 1</span> 
                    The Trigger
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Condition</label>
                        <select 
                          value={autoReplyConfig.triggerType}
                          onChange={(e) => setAutoReplyConfig({ ...autoReplyConfig, triggerType: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#FF6A00] transition-colors dark:text-white"
                        >
                          <option value="ALL_COMMENTS">Reply to ALL comments</option>
                          <option value="KEYWORD">Reply ONLY to specific keywords</option>
                        </select>
                      </div>
                      
                      {autoReplyConfig.triggerType === 'KEYWORD' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Keywords (Comma separated)</label>
                          <input 
                            type="text"
                            value={autoReplyConfig.keywords}
                            onChange={(e) => setAutoReplyConfig({ ...autoReplyConfig, keywords: e.target.value })}
                            placeholder="e.g. LINK, PRICE, BUY"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#FF6A00] transition-colors dark:text-white"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Public Comment Reply</label>
                      <input 
                        type="text"
                        value={autoReplyConfig.commentReply}
                        onChange={(e) => setAutoReplyConfig({ ...autoReplyConfig, commentReply: e.target.value })}
                        placeholder="Sent you a DM! 🚀"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-[#FF6A00] transition-colors dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 2 */}
              <div className="relative pl-8">
                <div className={`absolute left-0 top-0 bottom-0 w-px ${autoReplyConfig.hasButton ? 'bg-slate-300 dark:bg-slate-700' : 'bg-transparent'} translate-x-[11px] translate-y-8 transition-colors duration-500`}></div>
                <div className="absolute left-0 top-4 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 border-4 border-slate-50 dark:border-[#0f172a] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-blue-200 dark:border-blue-900/50 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2 relative z-10">
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-xs">Step 2</span> 
                    The Auto DM (Action)
                  </h3>

                  <div className="space-y-4 relative z-10">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Direct Message Content</label>
                      <textarea 
                        value={autoReplyConfig.dmMessage}
                        onChange={(e) => setAutoReplyConfig({ ...autoReplyConfig, dmMessage: e.target.value })}
                        placeholder="Hey! Thanks for commenting. Here is your info..."
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-blue-500 transition-colors custom-scrollbar dark:text-white"
                      />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                      <button 
                        onClick={() => setAutoReplyConfig({ ...autoReplyConfig, hasButton: !autoReplyConfig.hasButton })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${autoReplyConfig.hasButton ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoReplyConfig.hasButton ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Add a Button to this DM</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Allows users to tap for the next action.</p>
                      </div>
                    </div>

                    <AnimatePresence>
                      {autoReplyConfig.hasButton && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Button Label</label>
                            <input 
                              type="text"
                              value={autoReplyConfig.buttonText}
                              onChange={(e) => setAutoReplyConfig({ ...autoReplyConfig, buttonText: e.target.value })}
                              placeholder="e.g. Yes, Send Link!"
                              maxLength={20}
                              className="w-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl px-4 py-2.5 text-sm font-bold text-blue-700 dark:text-blue-300 focus:outline-none focus:border-blue-500 transition-colors"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* STEP 3 */}
              <AnimatePresence>
                {autoReplyConfig.hasButton && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="relative pl-8"
                  >
                    <div className="absolute left-0 top-4 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 border-4 border-slate-50 dark:border-[#0f172a] flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>

                    <div className="bg-white dark:bg-[#1e293b] p-5 rounded-2xl border border-green-200 dark:border-green-900/50 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 dark:bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                      
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2 relative z-10">
                        <span className="bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 px-2 py-0.5 rounded text-xs">Step 3</span> 
                        Button Click Action
                      </h3>

                      <div className="space-y-4 relative z-10">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Next Message (Sent immediately after click)</label>
                          <textarea 
                            value={autoReplyConfig.buttonNextMessage}
                            onChange={(e) => setAutoReplyConfig({ ...autoReplyConfig, buttonNextMessage: e.target.value })}
                            placeholder="Awesome! Here is your link..."
                            rows={3}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-green-500 transition-colors custom-scrollbar dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Attach a Link (Optional)</label>
                          <input 
                            type="url"
                            value={autoReplyConfig.buttonNextLink}
                            onChange={(e) => setAutoReplyConfig({ ...autoReplyConfig, buttonNextLink: e.target.value })}
                            placeholder="https://yoursite.com/offer"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-green-500 transition-colors dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1e293b] rounded-b-2xl flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setShowAutoReplyModal(false)}
                className="px-6 py-2.5 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={savePostAutomation}
                disabled={savingAutoReply}
                className="bg-[#FF6A00] hover:bg-[#FF6A00]/90 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-[#FF6A00]/20 text-sm"
              >
                {savingAutoReply ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Flow'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
