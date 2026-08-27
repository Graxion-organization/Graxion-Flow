import React, { useState, useEffect, useRef } from 'react';
import { 
  Linkedin, 
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

export default function LinkedInTool() {
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

    socket.on('li_auto_reply_progress', handleProgress);
    socket.on('new_linkedin_comment', handleNewComment);

    return () => {
      socket.off('li_auto_reply_progress', handleProgress);
      socket.off('new_linkedin_comment', handleNewComment);
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
      const res = await api.get('/social-hub/linkedin/manual/accounts');
      const fetchedAccounts = res.data.data.accounts || res.data.accounts || [];
      setAccounts(fetchedAccounts);
      if (fetchedAccounts.length > 0) {
        fetchMedia(fetchedAccounts[0]);
      }
    } catch (err) {
      toast.error('Failed to load LinkedIn accounts');
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
      api.get(`/social-hub/linkedin/manual/${account._id}/stats`).then(res => {
        setAccountStats(res.data.data);
      }).catch(err => console.error("Failed stats:", err))
      .finally(() => setLoadingStats(false));

      const res = await api.get(`/social-hub/linkedin/manual/${account._id}/media`);
      setMediaItems(res.data.data.media || res.data.posts || []);
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
      const res = await api.get(`/social-hub/linkedin/manual/${accountToUse._id}/media/${media.id}/comments`);
      const fetchedComments = res.data.data.comments || res.data.comments || [];
      const sortedComments = [...fetchedComments].sort((a, b) => new Date(b.createdAt || b.created || b.timestamp) - new Date(a.createdAt || a.created || a.timestamp));
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

      await api.post(`/social-hub/linkedin/manual/${selectedAccount._id}/comments/${targetId}/reply`, { text: messageText });
      
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
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-[#0b101e] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
      
      {/* COMPACT TOOLBAR */}
      <div className="flex items-center justify-between p-2 lg:p-3 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 shrink-0">
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Linkedin size={16} />
          </div>
          {accounts.length > 0 ? (
            <select 
              className="bg-transparent font-bold text-sm text-slate-800 dark:text-gray-100 outline-none cursor-pointer hover:bg-slate-200 dark:hover:bg-white/10 px-2 py-1.5 rounded-lg transition-colors appearance-none"
              value={selectedAccount?._id || ''}
              onChange={(e) => {
                const acc = accounts.find(a => a._id === e.target.value);
                if (acc) fetchMedia(acc);
              }}
            >
              {accounts.map(a => (
                <option key={a._id} value={a._id} className="text-slate-800 dark:bg-[#0f172a] dark:text-gray-100">
                  {a.name || 'Unknown Profile'}
                </option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-bold text-slate-400 px-2">No Profiles</span>
          )}
        </div>
        
        {selectedAccount && (
          <div className="flex items-center gap-1.5 lg:gap-2">
            
            <button onClick={async () => {
                try {
                  await api.post(`/social-hub/linkedin/manual/trigger-worker`, {});
                  toast.success('Sync started in background');
                } catch(e) {
                  toast.error('Failed to start sync');
                }
              }} 
              title="Force Sync DMs"
              className="p-1.5 lg:px-3 lg:py-1.5 bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 rounded-xl transition-colors font-bold flex items-center gap-2 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden lg:inline">Sync</span>
            </button>
            <button onClick={fetchAccounts} className="p-1.5 bg-slate-100 dark:bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-slate-500 dark:text-gray-400">
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAccounts ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {loadingAccounts && !selectedAccount ? (
        <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : !selectedAccount ? (
        <div className="flex-1 flex justify-center items-center text-slate-400 dark:text-gray-500 text-sm font-medium">No connected profile found. Connect a profile first.</div>
      ) : (
        <div className="flex-1 flex min-h-0 relative">
          
          {/* LEFT PANE: POSTS INBOX */}
          <div className={`w-full lg:w-[320px] xl:w-[350px] flex-col border-r border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 shrink-0 h-full ${selectedMedia ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-3 border-b border-slate-200 dark:border-white/5 shrink-0 flex items-center justify-between bg-white/50 dark:bg-[#0b101e]/50 backdrop-blur-md">
              <h2 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Inbox</h2>
              {accountStats && accountStats.pendingComments > 0 && (
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold shadow-sm">
                  {accountStats.pendingComments} Unread
                </span>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loadingMedia ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
              ) : mediaItems.length === 0 ? (
                <div className="text-center text-slate-400 dark:text-gray-500 text-xs py-8">No posts found.</div>
              ) : (
                mediaItems.map(media => (
                  <button
                    key={media.id}
                    onClick={() => fetchComments(media)}
                    className={`w-full text-left p-3 border-b transition-all flex gap-3 ${
                      selectedMedia?.id === media.id 
                        ? 'bg-blue-50 dark:bg-white/10 border-blue-100 dark:border-transparent relative' 
                        : 'border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/5'
                    }`}
                  >
                    {selectedMedia?.id === media.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                    )}
                    <img 
                      src={media.thumbnail_url || media.media_url || 'https://via.placeholder.com/150'} 
                      alt="Post" 
                      className="w-12 h-12 object-cover rounded-xl shrink-0 shadow-sm bg-slate-200 dark:bg-black/40"
                      onError={(e) => { e.target.src = 'https://via.placeholder.com/150'; }}
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{media.media_type || 'POST'}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-gray-200 line-clamp-1 leading-tight">
                        {media.commentary || media.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || 'No caption'}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* RIGHT PANE: CHAT VIEW */}
          <div className={`flex-1 flex-col relative bg-white dark:bg-transparent h-full ${!selectedMedia ? 'hidden lg:flex' : 'flex'}`}>
            {!selectedMedia ? (
              <div className="text-center text-slate-400 dark:text-gray-500 text-sm py-8 h-full flex flex-col items-center justify-center">
                <MessageCircle className="w-12 h-12 mb-4 opacity-20" />
                Select a post to view its comments
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-3 border-b border-slate-200 dark:border-white/5 shrink-0 flex justify-between items-center bg-white/90 dark:bg-[#0b101e]/90 backdrop-blur-md z-10 absolute top-0 left-0 right-0">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setSelectedMedia(null)}
                      className="lg:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-500"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    <div className="flex items-center gap-2">
                      <img src={selectedMedia.thumbnail_url || selectedMedia.media_url || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-lg object-cover" />
                      <div className="flex flex-col">
                        <span className="font-bold text-sm text-slate-800 dark:text-gray-100 leading-tight">Post Comments</span>
                        <span className="text-[10px] text-slate-500 truncate max-w-[150px] sm:max-w-[200px]">{selectedMedia.commentary || selectedMedia.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text || 'No caption'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={async () => {
                        try {
                          await api.post(`/social-hub/linkedin/manual/auto-reply-post`, { accountId: selectedAccount._id, mediaId: selectedMedia.id });
                          toast.success('AI is replying in background!');
                        } catch(e) { toast.error('Failed to start AI'); }
                      }} className="p-1.5 lg:px-3 lg:py-1.5 bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5">
                      <Cpu className="w-4 h-4" /> <span className="hidden lg:inline">AI Reply All</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {autoReplyProgress && (
                  <div className="absolute top-[57px] left-0 right-0 bg-blue-600/10 border-b border-blue-600/20 p-2 z-10 backdrop-blur-md">
                    <div className="flex justify-between text-[10px] font-bold text-blue-600 mb-1 px-1">
                      <span>{autoReplyProgress.status === 'completed' ? 'Completed!' : 'AI Processing...'}</span>
                      <span>{autoReplyProgress.processed} / {autoReplyProgress.total}</span>
                    </div>
                    <div className="w-full bg-black/10 rounded-full h-1 overflow-hidden">
                      <div className="bg-blue-600 h-1 transition-all duration-300" style={{ width: `${autoReplyProgress.total > 0 ? (autoReplyProgress.processed / autoReplyProgress.total) * 100 : 0}%` }}></div>
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 space-y-6 pt-20 pb-20">
                  {loadingComments ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                  ) : comments.length === 0 ? (
                    <div className="text-center text-slate-400 dark:text-gray-500 text-xs py-8">No comments on this post yet.</div>
                  ) : (
                    comments.map(comment => {
                      const username = comment.actor?.urn || comment.author || "LinkedIn User";
                      const text = comment.message?.text || comment.text || "Comment text";
                      const ts = comment.timestamp || comment.createdAt || comment.created || new Date().toISOString();

                      return (
                        <div key={comment.id} className="flex flex-col gap-2">
                          {/* User Comment Bubble */}
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                              <span className="text-xs font-bold text-slate-500 dark:text-slate-300">{username.charAt(0).toUpperCase()}</span>
                            </div>
                            <div className="flex flex-col items-start max-w-[85%]">
                              <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-bold text-xs text-slate-700 dark:text-gray-300">{username.substring(0, 15)}...</span>
                                <span className="text-[9px] text-slate-400">{new Date(ts).toLocaleTimeString()}</span>
                              </div>
                              <div 
                                onClick={() => setSelectedComment({id: comment.id, username: username})}
                                className={`px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm cursor-pointer transition-colors shadow-sm ${
                                  selectedComment?.id === comment.id 
                                    ? 'bg-blue-100 text-blue-900 border border-blue-200 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-800' 
                                    : 'bg-slate-100 text-slate-800 dark:bg-white/5 dark:text-gray-200'
                                }`}
                                dangerouslySetInnerHTML={{ __html: text }}
                              />
                            </div>
                          </div>

                          {/* Replies */}
                          {(comment.replies)?.data?.map(reply => {
                            const rUser = reply.username || reply.actor?.urn || "LinkedIn User";
                            const rText = reply.text || reply.message?.text || "";
                            const rTs = reply.timestamp || reply.createdAt || reply.created || new Date().toISOString();
                            return (
                              <div key={reply.id || reply.urn} className="flex gap-3 justify-end pl-12">
                                <div className="flex flex-col items-end max-w-[85%]">
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-[9px] text-slate-400">{new Date(rTs).toLocaleTimeString()}</span>
                                    <span className="font-bold text-xs text-blue-600">{rUser.substring(0, 15)}...</span>
                                  </div>
                                  <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm bg-blue-600 text-white shadow-sm" dangerouslySetInnerHTML={{ __html: rText }} />
                                </div>
                                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                                  <Linkedin className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Fixed Composer Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/90 dark:bg-[#0b101e]/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 shrink-0 z-20">
                  {selectedComment && (
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[11px] font-bold text-blue-500 flex items-center gap-1">
                        Replying to @{selectedComment.username.substring(0, 15)}...
                      </span>
                      <button onClick={() => setSelectedComment(null)} className="text-[10px] font-bold text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md">Cancel Reply</button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-1.5 focus-within:border-blue-600 dark:focus-within:border-blue-600 transition-colors">
                      <textarea
                        rows={1}
                        placeholder={selectedComment ? "Type a reply..." : "Comment on post..."}
                        value={messageText}
                        onChange={e => {
                           setMessageText(e.target.value);
                           e.target.style.height = 'auto';
                           e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendComment();
                          }
                        }}
                        className="w-full bg-transparent text-sm text-slate-800 dark:text-gray-100 focus:outline-none resize-none custom-scrollbar py-2 max-h-[100px]"
                      />
                    </div>
                    <button
                      onClick={handleSendComment}
                      disabled={isSending || !messageText.trim()}
                      className="w-10 h-10 shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-full flex items-center justify-center transition-all shadow-sm mb-1"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
