import React, { useState, useEffect, useRef } from 'react';
import { 
  Youtube, 
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
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { getSocket } from '../utils/socket';

export default function YouTubeTool() {
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
      const currentMedia = selectedMediaRef.current;
      const currentAccount = selectedAccountRef.current;
      if (currentMedia && currentAccount && String(data.accountId) === String(currentAccount._id)) {
        fetchComments(currentMedia, currentAccount, true);
      }
    };

    socket.on('yt_auto_reply_progress', handleProgress);
    socket.on('new_youtube_comment', handleNewComment);

    return () => {
      socket.off('yt_auto_reply_progress', handleProgress);
      socket.off('new_youtube_comment', handleNewComment);
    };
  }, []);

  // Auto-poll comments every 10 seconds when a post is selected (live refresh)
  useEffect(() => {
    if (!selectedMedia || !selectedAccount) return;

    const interval = setInterval(() => {
      fetchComments(selectedMedia, selectedAccount, true);
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
      const res = await api.get('/youtube/manual/accounts');
      const fetchedAccounts = res.data.data.accounts || [];
      setAccounts(fetchedAccounts);
      if (fetchedAccounts.length > 0) {
        fetchMedia(fetchedAccounts[0]);
      }
    } catch (err) {
      toast.error('Failed to load YouTube channels');
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
      // Fetch stats in parallel
      api.get(`/youtube/manual/${account._id}/stats`).then(res => {
        setAccountStats(res.data.data);
      }).catch(err => console.error("Failed stats:", err))
      .finally(() => setLoadingStats(false));

      const res = await api.get(`/youtube/manual/${account._id}/media`);
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
      const fetchedComments = res.data.data.comments || [];
      const sortedComments = [...fetchedComments].sort((a, b) => {
        const dateA = a.snippet?.topLevelComment?.snippet?.publishedAt || a.publishedAt || a.createdAt;
        const dateB = b.snippet?.topLevelComment?.snippet?.publishedAt || b.publishedAt || b.createdAt;
        return new Date(dateB) - new Date(dateA);
      });
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
      const targetId = selectedComment ? selectedComment.id : selectedMedia.id;
      const type = selectedComment ? 'comment' : 'media';

      await api.post(`/youtube/manual/${selectedAccount._id}/comments/${targetId}/reply`, { text: messageText });
      
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

  return (
    <div className="flex flex-col gap-6 pb-6 h-auto lg:h-[calc(100vh-120px)] min-h-screen lg:min-h-0">
      
      {/* HEADER: Active Account Info */}
      {selectedAccount && (
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-500/20 rounded-xl">
              <Youtube className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900 dark:text-gray-100">{selectedAccount.channelName || 'Unknown Channel'}</h2>
              <div className="text-sm text-slate-500 dark:text-gray-400 flex items-center gap-1">
                <UserIcon className="w-4 h-4" />
                ID: {selectedAccount.channelId || 'No ID'}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                try {
                  await api.post('/youtube/manual/trigger-worker', {});
                  toast.success('Sync started. Please wait a moment for comments to update.');
                } catch(e) {
                  toast.error('Failed to start sync');
                }
              }} 
              title="Force Sync Unanswered DMs"
              className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-xl transition-colors font-bold flex items-center gap-2 text-sm"
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
        <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-red-500" /></div>
      ) : !selectedAccount ? (
        <div className="flex-1 flex justify-center items-center text-slate-400 dark:text-gray-500">No connected channels found. Connect a channel first.</div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          
          {/* COLUMN 1: Media Posts & Stats */}
          <div className="w-full lg:w-1/3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl flex flex-col overflow-hidden shrink-0 h-[400px] lg:h-auto">
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
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
                  src={media.snippet?.thumbnails?.medium?.url || media.snippet?.thumbnails?.high?.url || 'https://via.placeholder.com/150'} 
                  alt="Post" 
                  className="w-16 h-16 object-cover rounded-lg shrink-0 bg-slate-200 dark:bg-black/40"
                  onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-slate-500 dark:text-gray-400 capitalize mb-1">{media.media_type}</div>
                  <div className="text-sm text-slate-800 dark:text-gray-200 line-clamp-2 leading-tight">
                    {media.snippet?.title || 'No caption'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* COLUMN 3: Comments & Composer */}
      <div className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl flex flex-col overflow-hidden relative min-h-[500px] lg:min-h-0">
        <div className="p-4 border-b border-slate-200 dark:border-white/10 shrink-0 flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-500" />
            Comments & Replies
          </h2>
          {selectedMedia && (
            <button
              onClick={async () => {
                try {
                  await api.post('/youtube/manual/auto-reply-post', {
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
              <Cpu className="w-3.5 h-3.5" /> AI Auto-Reply All (Coming Soon)
            </button>
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

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 pb-40">
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
                    <span className="font-bold text-sm text-slate-800 dark:text-gray-200">@{comment.snippet?.topLevelComment?.snippet?.authorDisplayName || comment.authorDisplayName || "Unknown"}</span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500">{new Date(comment.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-gray-300">{comment.snippet?.topLevelComment?.snippet?.textDisplay || comment.text || ""}</p>
                </div>
                
                {/* Replies */}
                {comment.replies && comment.replies.data && comment.replies.data.map(reply => (
                  <div key={reply.id} className="ml-8 p-3 rounded-xl bg-slate-200 dark:bg-black/40 border border-slate-200 dark:border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-blue-400">@{reply.snippet?.authorDisplayName || "Unknown"}</span>
                      <span className="text-[10px] text-slate-400 dark:text-gray-500">{new Date(reply.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-gray-300">{reply.snippet?.textDisplay || reply.text || ""}</p>
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
    </div>
  );
}
