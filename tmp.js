const fs = require('fs');

const igContent = fs.readFileSync('frontend/src/pages/InstagramToolPage.jsx', 'utf8');

// Facebook Tool Page
let fbContent = igContent.replace(/InstagramTool/g, 'FacebookTool');
fbContent = fbContent.replace(/\/instagram\/manual/g, '/facebook/manual');
fbContent = fbContent.replace(/Instagram accounts/g, 'Facebook accounts');
fbContent = fbContent.replace(/IG Accounts/g, 'FB Pages');
fbContent = fbContent.replace(/<Instagram /g, '<Facebook ');
fbContent = fbContent.replace(/text-pink-500/g, 'text-blue-600');
fbContent = fbContent.replace(/bg-pink-500/g, 'bg-blue-600');
fbContent = fbContent.replace(/igUsername/g, 'pageName');
fbContent = fbContent.replace(/user\?\.name/g, 'pageName'); // Fallback
fbContent = fbContent.replace(/ig_auto_reply_progress/g, 'fb_auto_reply_progress');
fbContent = fbContent.replace(/<Cpu className="w-3\.5 h-3\.5" \/> AI Auto-Reply All/g, '<Cpu className="w-3.5 h-3.5" /> AI Auto-Reply All (Coming Soon)');
fbContent = fbContent.replace(/import {.*?Instagram.*?}/, 'import { Facebook, Search, Send, MessageCircle, Image as ImageIcon, Loader2, RefreshCw, ChevronRight, User as UserIcon, CheckCircle2, AlertCircle, Cpu, BarChart3 }');

fs.writeFileSync('frontend/src/pages/FacebookToolPage.jsx', fbContent);

// YouTube Tool Page
let ytContent = igContent.replace(/InstagramTool/g, 'YouTubeTool');
ytContent = ytContent.replace(/\/instagram\/manual/g, '/youtube/manual');
ytContent = ytContent.replace(/Instagram accounts/g, 'YouTube channels');
ytContent = ytContent.replace(/IG Accounts/g, 'YT Channels');
ytContent = ytContent.replace(/<Instagram /g, '<Youtube ');
ytContent = ytContent.replace(/text-pink-500/g, 'text-red-500');
ytContent = ytContent.replace(/bg-pink-500/g, 'bg-red-500');
ytContent = ytContent.replace(/igUsername/g, 'channelName');
ytContent = ytContent.replace(/user\?\.name/g, 'channelName'); 
ytContent = ytContent.replace(/ig_auto_reply_progress/g, 'yt_auto_reply_progress');
ytContent = ytContent.replace(/<Cpu className="w-3\.5 h-3\.5" \/> AI Auto-Reply All/g, '<Cpu className="w-3.5 h-3.5" /> AI Auto-Reply All (Coming Soon)');
ytContent = ytContent.replace(/import {.*?Instagram.*?}/, 'import { Youtube, Search, Send, MessageCircle, Image as ImageIcon, Loader2, RefreshCw, ChevronRight, User as UserIcon, CheckCircle2, AlertCircle, Cpu, BarChart3 }');

// We need to parse snippet stuff for YT properly, but we'll do an inline replace for now.
ytContent = ytContent.replace(/comment\.username/g, 'comment.snippet?.topLevelComment?.snippet?.authorDisplayName || comment.authorDisplayName || "Unknown"');
ytContent = ytContent.replace(/reply\.username/g, 'reply.snippet?.authorDisplayName || "Unknown"');
ytContent = ytContent.replace(/comment\.text/g, 'comment.snippet?.topLevelComment?.snippet?.textDisplay || comment.text || ""');
ytContent = ytContent.replace(/reply\.text/g, 'reply.snippet?.textDisplay || reply.text || ""');
ytContent = ytContent.replace(/media\.caption/g, 'media.snippet?.title');
ytContent = ytContent.replace(/media\.thumbnail_url/g, 'media.snippet?.thumbnails?.medium?.url');
ytContent = ytContent.replace(/media\.media_url/g, 'media.snippet?.thumbnails?.high?.url');

fs.writeFileSync('frontend/src/pages/YouTubeToolPage.jsx', ytContent);

// LinkedIn Tool Page
let liContent = igContent.replace(/InstagramTool/g, 'LinkedInTool');
liContent = liContent.replace(/\/instagram\/manual/g, '/social-hub/linkedin/manual');
liContent = liContent.replace(/Instagram accounts/g, 'LinkedIn accounts');
liContent = liContent.replace(/IG Accounts/g, 'LI Profiles');
liContent = liContent.replace(/<Instagram /g, '<Linkedin ');
liContent = liContent.replace(/text-pink-500/g, 'text-blue-700');
liContent = liContent.replace(/bg-pink-500/g, 'bg-blue-700');
liContent = liContent.replace(/igUsername/g, 'name');
liContent = liContent.replace(/user\?\.name/g, 'name'); 
liContent = liContent.replace(/ig_auto_reply_progress/g, 'li_auto_reply_progress');
liContent = liContent.replace(/<Cpu className="w-3\.5 h-3\.5" \/> AI Auto-Reply All/g, '<Cpu className="w-3.5 h-3.5" /> AI Auto-Reply All (Coming Soon)');
liContent = liContent.replace(/import {.*?Instagram.*?}/, 'import { Linkedin, Search, Send, MessageCircle, Image as ImageIcon, Loader2, RefreshCw, ChevronRight, User as UserIcon, CheckCircle2, AlertCircle, Cpu, BarChart3 }');

liContent = liContent.replace(/comment\.username/g, 'comment.actor?.urn || "LinkedIn User"');
liContent = liContent.replace(/comment\.text/g, 'comment.message?.text || "Comment text"');
liContent = liContent.replace(/media\.caption/g, 'media.specificContent?.["com.linkedin.ugc.ShareContent"]?.shareCommentary?.text');

fs.writeFileSync('frontend/src/pages/LinkedInToolPage.jsx', liContent);
