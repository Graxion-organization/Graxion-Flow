import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import ActionGuard from '../components/dashboard/ActionGuard';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Eye,
  Facebook,
  Globe,
  Image as ImageIcon,
  Info,
  Instagram,
  Layout,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  MessageSquare,
  Send,
  Share2,
  Trash2,
  UserCircle,
  Video,
  Heart,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  Sparkles,
  X,
  Youtube,
  Linkedin,
  SunMedium,
  Moon,
  BarChart2,
} from 'lucide-react';
import { socialHubAPI, youtubeAPI } from '../services/api';
import toast from 'react-hot-toast';
import socket from '../utils/socket';
import { useAuthStore } from '../store';
import BrandCopilotTab from '../components/social/BrandCopilotTab';
import AICaptionWriter from '../components/social/AICaptionWriter';
import TodayAnalyticsPanel from '../components/social/TodayAnalyticsPanel';
import SocialCalendarTab from '../components/social/SocialCalendarTab';

const PIPELINE_STEPS = [
  { id: 'validating', label: 'Validating', icon: ShieldCheck },
  { id: 'transforming', label: 'Transforming', icon: Zap },
  { id: 'uploading', label: 'Uploading', icon: ImageIcon },
  { id: 'processing', label: 'Processing', icon: Loader2 },
  { id: 'publishing', label: 'Publishing', icon: Send },
  { id: 'verifying', label: 'Verifying', icon: CheckCircle2 },
];

const getPipelineStatus = (status) => {
  const mapping = {
    pending: 'validating',
    connecting: 'transforming',
    uploading: 'uploading',
    processing: 'processing',
    publishing: 'publishing',
    verifying: 'verifying',
    success: 'completed',
    failed: 'failed',
    retrying: 'processing',
  };
  return mapping[status] || 'validating';
};

const TABS = [
  { id: 'publish', label: 'Create Post', icon: Send },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'today', label: 'Activity & Insights', icon: BarChart2 },
  { id: 'copilot', label: 'AI Brand Copilot', icon: Sparkles },
  { id: 'feed', label: 'Content Library', icon: Layout },
  { id: 'accounts', label: 'Manage Accounts', icon: LinkIcon },
  { id: 'profile', label: 'Profile Sync', icon: UserCircle },
];

const PLATFORM_ICON = {
  instagram: <Instagram size={16} className="text-pink-500" />,
  facebook: <Facebook size={16} className="text-blue-500" />,
  whatsapp: <MessageSquare size={16} className="text-green-500" />,
  telegram: <Send size={16} className="text-sky-500" />,
  youtube: <Youtube size={16} className="text-red-600" />,
  linkedin: <Linkedin size={16} className="text-[#0077b5]" />,
};

const POST_TYPES = [
  { id: 'post', label: 'Feed Post', icon: ImageIcon },
  { id: 'reel', label: 'Reel', icon: Video },
  { id: 'story', label: 'Story', icon: Share2 },
  { id: 'carousel', label: 'Carousel', icon: Layout },
];

const MEDIA_INPUT_TYPES = [
  { id: 'upload', label: 'Upload Local File' },
  { id: 'link', label: 'Upload via Link' },
  { id: 'ai', label: 'Generate with AI' },
];

const AI_STYLE_OPTIONS = ['Social Media Post', 'Product Ad', 'Promotional Banner', 'Minimal', 'Modern Business'];
const AI_ASPECT_OPTIONS = [
  { label: 'Square (1:1)', value: '1:1' },
  { label: 'Portrait (4:5)', value: '4:5' },
  { label: 'Story (9:16)', value: '9:16' },
];

export default function SocialPublishingPage() {
  const navigate = useNavigate();
  const { onboardingStatus } = useOutletContext() || {};
  const { user, fetchUser } = useAuthStore();
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const [activeTab, setActiveTab] = useState('publish');
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState(null);

  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState([]);
  const [postType, setPostType] = useState('post');
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('');
  const [mediaInputType, setMediaInputType] = useState('upload');
  const [carouselMediaUrls, setCarouselMediaUrls] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState('Social Media Post');
  const [aiAspectRatio, setAiAspectRatio] = useState('1:1');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewNudge, setPreviewNudge] = useState(false);
  const [showSidebarPreview, setShowSidebarPreview] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState('instagram');
  const [feedFilter, setFeedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [feed, setFeed] = useState([]);
  const [profileData, setProfileData] = useState({ name: '', description: '' });
  const [publishMode, setPublishMode] = useState('instant'); // 'instant' or 'scheduled'
  const [scheduledAt, setScheduledAt] = useState('');
  const [editingJobId, setEditingJobId] = useState(null);
  const [retryingPlatform, setRetryingPlatform] = useState({ jobId: null, platform: null });
  const [youtubeOptions, setYoutubeOptions] = useState({ title: '', description: '', firstComment: '' });
  
  // YouTube Automation State
  const [ytAutoSettings, setYtAutoSettings] = useState({
    enabled: false,
    automationMode: 'manual',
    aiPrompt: 'You are a helpful YouTube creator. Reply to this comment in a friendly and engaging way. Keep it short and encourage the viewer.'
  });
  const [ytPendingComments, setYtPendingComments] = useState([]);
  const [loadingYtAuto, setLoadingYtAuto] = useState(false);
  const [showAICaptionWriter, setShowAICaptionWriter] = useState(false);
  
  const touchStartXRef = useRef(null);

  const [viewingInsights, setViewingInsights] = useState(null);
  const [insightsData, setInsightsData] = useState({});
  const [loadingInsights, setLoadingInsights] = useState(false);

  const selectedAccounts = useMemo(
    () => connectedAccounts.filter((acc) => selectedAccountIds.includes(acc.id)),
    [connectedAccounts, selectedAccountIds]
  );

  useEffect(() => {
    if (viewingInsights) {
      setLoadingInsights(true);
      setInsightsData({});
      
      const fetchAll = async () => {
        const results = {};
        for (const p of viewingInsights.originalPosts) {
           const actualItem = p.originalItem || p;
           if (!actualItem.id || !actualItem.accountId) continue;
           if (!['facebook', 'instagram'].includes(p.platform)) continue;
           
           try {
              const res = await socialHubAPI.getInsights(p.platform, actualItem.id, actualItem.accountId);
              results[p.platform] = res.data.data;
           } catch(err) {
              results[p.platform] = { error: true };
           }
        }
        setInsightsData(results);
        setLoadingInsights(false);
      };
      
      fetchAll();
    }
  }, [viewingInsights]);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  useEffect(() => {
    fetchUser();
    fetchAccounts();
    fetchYtAutoSettings();
    fetchYtPendingComments();

    // Listen for real-time publishing updates
    socket.on('social_publish_status', (data) => {
      setFeed((prev) => prev.map(job => {
        if (job.jobId === data.jobId) {
          const newExecutions = (job.executions || []).map(e => 
            e.platform === data.execution.platform ? { ...e, ...data.execution } : e
          );
          // If execution not found (new platform?), add it
          if (!newExecutions.find(e => e.platform === data.execution.platform)) {
             newExecutions.push(data.execution);
          }
          return { ...job, executions: newExecutions };
        }
        return job;
      }));
    });

    return () => {
      socket.off('social_publish_status');
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'feed') fetchFeed();
  }, [activeTab]);

  useEffect(() => {
    if (postType === 'story' && selectedAccounts.some(a => a.platform === 'facebook')) {
      setPostType('post');
      toast.error('Facebook does not support Story publishing via API. Switched to Feed Post.');
    }
    
    // YouTube specific: if only YouTube selected and postType is not Reel, switch to Reel
    const isOnlyYoutube = selectedAccounts.length > 0 && selectedAccounts.every(a => a.platform === 'youtube');
    if (isOnlyYoutube && postType !== 'reel') {
      setPostType('reel');
      toast.error('YouTube only supports Shorts (Reels). Switched to Reel.');
    }
  }, [selectedAccountIds, postType, selectedAccounts]);

  useEffect(() => {
    if (!mediaUrl && carouselMediaUrls.length === 0) return;
    setShowSidebarPreview(true);
    setPreviewNudge(true);
    const t = setTimeout(() => setPreviewNudge(false), 2200);
    return () => clearTimeout(t);
  }, [mediaUrl, carouselMediaUrls.length]);

  useEffect(() => {
    setPreviewIndex(0);
  }, [postType, mediaUrl, carouselMediaUrls.length]);

  useEffect(() => {
    if (!showSidebarPreview) return;
    setPreviewNudge(false);
  }, [showSidebarPreview]);

  // Removed auto-deselect Instagram logic as it supports video for Reels/Stories/Posts.
  const isVideoUrl = (url = '') => /\.(mp4|mov|avi|wmv|webm|m4v)(?:\?|$|#)/i.test(url) || url.toLowerCase().includes('/video/');

  // True only for normal 'post' type with video — reel/story/carousel me koi restriction nahi
  const isVideoMedia = postType === 'post' && (mediaType === 'video' || isVideoUrl(mediaUrl));

  const filteredFeed = useMemo(
    () =>
      feed.filter(
        (p) =>
          (feedFilter === 'all' || 
           (feedFilter === 'scheduled' ? p.mode === 'scheduled' : 
            feedFilter === 'failed' ? (p.overallStatus === 'failed' || p.overallStatus === 'partially_failed') :
            p.platform === feedFilter)) &&
          (!searchQuery || (p.caption || '').toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    [feed, feedFilter, searchQuery]
  );

  const { unifiedFeed: groupedFeed, duplicateAlerts } = useMemo(() => {
    const duplicatesMap = new Map();
    const uniquePosts = [];

    const sortedFeed = [...filteredFeed].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const processedKeys = new Set();
    sortedFeed.forEach(post => {
      const mediaKey = post.mediaUrl ? post.mediaUrl : null;
      const captionKey = (post.caption || '').trim().substring(0, 50).toLowerCase();
      
      // Separate keys for Job vs Real post to allow them to coexist in the processedKeys during grouping
      // but we use a common key for actual duplicate detection on the same platform
      const dupKeyBase = `${post.platform}_${mediaKey || captionKey}`;
      
      let isDuplicate = false;
      let dupKey = null;

      // Only flag as duplicate if it's the SAME type (Job vs Job or Real vs Real) 
      // or if we already have a Real post and this is another Real post.
      const processedTypeKey = `${post.isJob ? 'job' : 'real'}_${dupKeyBase}`;

      if (processedKeys.has(processedTypeKey)) {
         isDuplicate = true;
         dupKey = processedTypeKey;
      }

      if (isDuplicate) {
         if (!duplicatesMap.has(dupKey)) {
             const original = uniquePosts.find(p => {
                const pKey = `${p.isJob ? 'job' : 'real'}_${p.platform}_${p.mediaUrl || (p.caption || '').trim().substring(0, 50).toLowerCase()}`;
                return pKey === dupKey;
             });
             if (original) {
               duplicatesMap.set(dupKey, [original]);
             }
         }
         if (duplicatesMap.has(dupKey)) {
             duplicatesMap.get(dupKey).push(post);
         }
      } else {
         uniquePosts.push(post);
         processedKeys.add(processedTypeKey);
      }
    });

    const duplicates = Array.from(duplicatesMap.values()).map(posts => ({
        platform: posts[0].platform,
        mediaUrl: posts[0].mediaUrl,
        caption: posts[0].caption,
        type: posts[0].type,
        originalPosts: posts
    }));

    const unified = [];
    uniquePosts.forEach(post => {
      const postTime = new Date(post.timestamp).getTime();
      const mediaKey = post.mediaUrl;
      const captionKey = (post.caption || '').trim().substring(0, 50).toLowerCase();
      
      let foundGroup = unified.find(g => {
        const timeDiff = Math.abs(new Date(g.timestamp).getTime() - postTime);
        const isCloseTime = timeDiff <= 5 * 60 * 1000;
        const isSameMedia = mediaKey && g.mediaUrl === mediaKey;
        const isSameCaption = captionKey.length > 5 && g.captionKey === captionKey;
        
        return (isSameMedia || isSameCaption) && isCloseTime;
      });

      if (foundGroup) {
         if (!foundGroup.platforms.includes(post.platform)) {
             foundGroup.platforms.push(post.platform);
         }
         foundGroup.originalPosts.push(post);
      } else {
         unified.push({
            ...post,
            captionKey,
            platforms: post.platforms ? [...post.platforms] : [post.platform],
            originalPosts: [post]
         });
      }
    });

    return { unifiedFeed: unified, duplicateAlerts: duplicates };
  }, [filteredFeed]);

  const getLocalISOString = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const offset = d.getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = new Date(d.getTime() - offset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const fetchAccounts = async () => {
    try {
      const res = await socialHubAPI.getAccounts();
      const data = res.data.data || [];
      const filteredData = data.filter(acc => acc.platform !== 'whatsapp' && acc.platform !== 'telegram');
      setConnectedAccounts(filteredData);
      if (filteredData.length > 0) {
        setSelectedAccountIds([filteredData[0].id]);
        setPreviewPlatform(filteredData[0].platform);
        setProfileData({ name: filteredData[0].name || '', description: '' });
      }
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeed = async () => {
    setLoadingFeed(true);
    try {
      const res = await socialHubAPI.getFeed();
      setFeed(res.data.data || []);
    } catch {
      toast.error('Failed to load feed');
    } finally {
      setLoadingFeed(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    const toastId = toast.loading('Uploading media...');
    try {
      const res = await socialHubAPI.upload(formData);
      const url = res.data.data.url;
      const detectedType = res.data.data.resourceType || (/\.(mp4|mov|avi|wmv|webm)$/i.test(url) ? 'video' : 'image');
      if (postType === 'carousel') {
        setCarouselMediaUrls((prev) => [...prev, url]);
      } else {
        setMediaUrl(url);
        setMediaType(detectedType);
      }
      // Removed auto-deselect Instagram logic
      toast.success('Media uploaded', { id: toastId });
    } catch {
      toast.error('Upload failed', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleEditJob = (post) => {
    setEditingJobId(post.jobId);
    setCaption(post.caption);
    setPostType(post.type || 'post');
    if (post.mediaUrl) {
      setMediaUrl(post.mediaUrl);
      setCarouselMediaUrls([post.mediaUrl]);
    }
    setPublishMode('scheduled');
    setScheduledAt(getLocalISOString(post.timestamp));
    setActiveTab('publish');
    toast.success('Edit mode: Modify your scheduled post');
  };

  const handleCrossPost = (post) => {
    setEditingJobId(null);
    setCaption(post.caption || '');
    let type = String(post.type || 'post').trim().toLowerCase();
    if (type === 'carosul') type = 'carousel';
    if (!['post', 'reel', 'story', 'carousel'].includes(type)) {
      type = 'post';
    }
    setPostType(type);
    
    if (post.mediaUrl) {
      setMediaUrl(post.mediaUrl);
      if (type === 'carousel') {
        setCarouselMediaUrls([post.mediaUrl]);
      } else {
        setCarouselMediaUrls([]);
      }
      setMediaType(/\.(mp4|mov|avi|wmv|webm)$/i.test(post.mediaUrl) ? 'video' : 'image');
    } else {
      setMediaUrl('');
      setCarouselMediaUrls([]);
    }

    const usedAccountIds = new Set();
    if (post.isJob && post.executions) {
      post.executions.forEach(e => {
        if (['success', 'processing', 'publishing', 'connecting', 'pending'].includes(e.status)) {
          usedAccountIds.add(e.accountId);
        }
      });
    } else if (post.originalPosts) {
      post.originalPosts.forEach(p => usedAccountIds.add(p.accountId));
    }

    const remainingAccounts = connectedAccounts.filter(acc => !usedAccountIds.has(acc.id));
    setSelectedAccountIds(remainingAccounts.map(a => a.id));

    setPublishMode('instant');
    setScheduledAt('');
    setActiveTab('publish');
    
    if (remainingAccounts.length === 0) {
      toast.error('This post is already published to all connected platforms.');
    } else {
      toast.success('Cross-post mode: Ready to publish to remaining platforms');
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (selectedAccountIds.length === 0) return toast.error('Please select at least one platform');
    if (!caption.trim() && postType !== 'story') return toast.error('Caption is required');
    const finalMediaUrls = postType === 'carousel' ? carouselMediaUrls : mediaUrl ? [mediaUrl] : [];
    if (finalMediaUrls.length === 0) return toast.error('Please add media (upload, link, or AI generated image)');
    if (postType === 'carousel' && finalMediaUrls.length < 2) return toast.error('Carousel needs at least 2 media items');

    // Block Instagram if video media is selected
    const hasInstagram = selectedAccounts.some(a => a.platform === 'instagram');    // Instagram supports video (Reels, Stories, and standard posts)
    
    // YouTube validation
    const hasYoutube = selectedAccounts.some(a => a.platform === 'youtube');
    if (hasYoutube) {
       if (postType !== 'reel') return toast.error('YouTube only supports Shorts (Reel)');
       if (isVideoUrl(finalMediaUrls[0])) {
          // In a real app we'd check duration/aspect here. For now, we'll warn.
          toast.success('YouTube Short validation: Video detected. Duration should be <= 60s and aspect 9:16.');
       }
    }

    setPublishing(true);
    const toastId = toast.loading(editingJobId ? 'Updating...' : 'Publishing...');
    try {
      const targets = connectedAccounts.filter((acc) => selectedAccountIds.includes(acc.id));
      
      let res;
      if (editingJobId) {
        res = await socialHubAPI.updateJob(editingJobId, {
          type: postType,
          caption,
          platforms: targets,
          mediaUrls: finalMediaUrls,
          mode: publishMode,
          scheduledAt: publishMode === 'scheduled' ? new Date(scheduledAt).toISOString() : undefined,
          platformOptions: hasYoutube ? { youtube: youtubeOptions } : undefined,
        });
      } else {
        res = await socialHubAPI.publish({
          type: postType,
          caption,
          platforms: targets,
          mediaUrls: finalMediaUrls,
          mode: publishMode,
          scheduledAt: publishMode === 'scheduled' ? new Date(scheduledAt).toISOString() : undefined,
          platformOptions: hasYoutube ? { youtube: youtubeOptions } : undefined,
        });
      }

      const jobData = res.data?.data;
      if (jobData?.overallStatus === 'failed') {
        toast.error('Publishing failed', { id: toastId });
      } else if (jobData?.overallStatus === 'partially_failed') {
        toast.error('Published with some errors', { id: toastId });
      } else {
        toast.success(editingJobId ? 'Updated successfully' : 'Published successfully', { id: toastId });
      }

      if (jobData) {
        const newFeedPost = {
          id: jobData._id,
          jobId: jobData._id,
          caption: jobData.masterContent?.text,
          mediaUrl: jobData.masterContent?.mediaUrls?.[0],
          platform: jobData.selectedPlatforms?.[0] || 'multiple',
          platforms: jobData.selectedPlatforms || [],
          executions: jobData.executions,
          timestamp: jobData.scheduledAt || jobData.createdAt,
          mode: jobData.mode,
          overallStatus: jobData.overallStatus,
          isJob: true,
          type: jobData.masterContent?.type || 'post'
        };
        setFeed((prev) => {
          if (editingJobId) {
            return prev.map(p => p.jobId === editingJobId ? { ...p, ...newFeedPost } : p);
          }
          return [newFeedPost, ...prev];
        });
      }

      setCaption('');
      setMediaUrl('');
      setCarouselMediaUrls([]);
      setGeneratedImage(null);
      setEditingJobId(null);
      setPublishMode('instant');
      setScheduledAt('');
      fetchUser(); // Refresh credits and limits!
    } catch (err) {
      toast.error(err.response?.data?.message || 'Publishing failed', { id: toastId });
    } finally {
      setPublishing(false);
    }
  };

  const handleGenerateAiImage = async () => {
    if (!aiPrompt.trim()) return toast.error('Please enter an image prompt');

    setAiGenerating(true);
    const toastId = toast.loading('Generating image with Gemini...');

    try {
      const res = await socialHubAPI.generateImage({
        prompt: aiPrompt.trim(),
        style: aiStyle,
        aspectRatio: aiAspectRatio,
      });

      const generatedData = res.data?.data;
      if (!generatedData?.url) {
        throw new Error('No image URL returned from AI generation.');
      }

      setGeneratedImage(generatedData);
      toast.success('Image generated successfully', { id: toastId });
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'AI image generation failed', { id: toastId });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleUseGeneratedImage = () => {
    if (!generatedImage?.url) return;

    if (postType === 'carousel') {
      setCarouselMediaUrls((prev) => [...prev, generatedImage.url]);
    } else {
      setMediaUrl(generatedImage.url);
      setMediaType('image');
    }

    toast.success('AI image added to post');
  };

  const handleRetryPlatform = async (jobId, platform) => {
    setRetryingPlatform({ jobId, platform });
    const toastId = toast.loading(`Retrying ${platform}...`);
    try {
      await socialHubAPI.retryPlatform({ jobId, platform });
      toast.success(`Retry started for ${platform}`, { id: toastId });
      // Refresh feed after a short delay to see update
      setTimeout(fetchFeed, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Retry failed', { id: toastId });
    } finally {
      setRetryingPlatform({ jobId: null, platform: null });
    }
  };

  // YouTube Automation Handlers
  const fetchYtAutoSettings = async () => {
    try {
      const res = await youtubeAPI.getAutomationSettings();
      if (res.data) setYtAutoSettings(res.data);
    } catch (err) {
      console.error('Failed to fetch YT auto settings');
    }
  };

  const fetchYtPendingComments = async () => {
    try {
      setLoadingYtAuto(true);
      const res = await youtubeAPI.getPendingComments();
      setYtPendingComments(res.data || []);
    } catch (err) {
      console.error('Failed to fetch pending comments');
    } finally {
      setLoadingYtAuto(false);
    }
  };

  const handleUpdateYtAutoSettings = async () => {
    try {
      const res = await youtubeAPI.updateAutomationSettings(ytAutoSettings);
      setYtAutoSettings(res.data);
      toast.success('Settings updated');
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };

  const handleApproveYtReply = async (commentId, customReply) => {
    try {
      await youtubeAPI.approveReply(commentId, customReply);
      setYtPendingComments(prev => prev.filter(c => c.commentId !== commentId));
      toast.success('Reply posted!');
    } catch (err) {
      toast.error('Failed to post reply');
    }
  };

  const handleIgnoreYtComment = async (commentId) => {
    try {
      await youtubeAPI.ignoreComment(commentId);
      setYtPendingComments(prev => prev.filter(c => c.commentId !== commentId));
      toast.success('Comment ignored');
    } catch (err) {
      toast.error('Failed to ignore');
    }
  };

  const handleLinkedinConnect = async () => {
    try {
      const res = await socialHubAPI.getLinkedInAuthUrl();
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('Could not get LinkedIn authorization URL');
      }
    } catch (err) {
      toast.error('LinkedIn connection failed to initialize');
    }
  };

  const handleDeletePostGroup = async (groupedPost) => {
    if (!window.confirm(`Delete this post from ${groupedPost.platforms.join(', ')}?`)) return;
    const deletingId = groupedPost.id || groupedPost.originalPosts[0].id;
    setDeletingPostId(deletingId);
    let successCount = 0;
    try {
      for (const p of groupedPost.originalPosts) {
        try {
          const actualItem = p.originalItem || p;
          await socialHubAPI.deletePost({ 
            platform: p.platform, 
            postId: actualItem.id, 
            accountId: actualItem.accountId, 
            isJob: actualItem.isJob, 
            jobId: actualItem.jobId || actualItem.id
          });
          setFeed((prev) => prev.filter((item) => item.id !== actualItem.id && item.jobId !== actualItem.jobId));
          successCount++;
        } catch (err) {
          console.error('Failed to delete', p.id, err);
        }
      }
      if (successCount === groupedPost.originalPosts.length) {
        toast.success('Post deleted from all platforms');
      } else {
        toast.error(`Deleted from ${successCount}/${groupedPost.originalPosts.length} platforms`);
      }
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    if (selectedAccountIds.length === 0) return toast.error('Select at least one account');
    setPublishing(true);
    try {
      await socialHubAPI.updateProfile({
        name: profileData.name,
        description: profileData.description,
        platforms: selectedAccounts,
      });
      toast.success('Profile synced');
    } catch {
      toast.error('Profile sync failed');
    } finally {
      setPublishing(false);
    }
  };

  const renderIphonePreview = () => {
    const isStory = postType === 'story';
    const isReel = postType === 'reel';
    const isCarousel = postType === 'carousel';
    const previewSource = isCarousel ? carouselMediaUrls[previewIndex] : mediaUrl;
    const previewIsVideo = isCarousel ? isVideoUrl(previewSource || '') : mediaType === 'video';
    const media = previewSource ? (
      previewIsVideo ? (
        <video src={previewSource} className="w-full h-full object-cover" autoPlay muted loop />
      ) : (
        <img src={previewSource} className="w-full h-full object-cover" alt="preview" />
      )
    ) : (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <ImageIcon size={38} className="text-gray-300" />
      </div>
    );

    return (
      <div
        className="mx-auto w-full rounded-[2.6rem] bg-black/95 p-[6px] shadow-xl"
        style={{ height: 'min(56vh, 520px)', aspectRatio: '393 / 852', width: 'auto', maxWidth: '100%' }}
      >
        <div className="relative w-full h-full overflow-hidden rounded-[2.2rem] bg-white ring-1 ring-black/10">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 h-6 w-28 rounded-full bg-black/95" />
          <div className={`h-full pt-10 overflow-hidden ${isStory || isReel ? 'bg-black text-white' : 'bg-white text-gray-900'}`}>
            {isStory ? (
              <div className="h-full relative">
                {media}
                <div className="absolute top-5 left-4 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-white/80" />
                  <span className="text-[10px] font-semibold">your_story</span>
                </div>
                <div className="absolute bottom-5 left-4 right-4 border border-white/40 rounded-full px-3 py-2 text-[10px]">Reply</div>
              </div>
            ) : isReel ? (
              <div className="h-full relative">
                {media}
                <div className="absolute bottom-4 left-4 right-16">
                  <p className="text-[10px] font-semibold mb-1">@your_account</p>
                  <p className="text-[10px] line-clamp-2">{caption || 'Add your caption...'}</p>
                </div>
                <div className="absolute bottom-20 right-3 flex flex-col items-center gap-3">
                  <Heart size={18} />
                  <MessageCircle size={18} />
                  <Send size={18} />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="h-11 border-b flex items-center px-3 justify-between bg-white">
                  <span className="text-[10px] font-semibold uppercase">{previewPlatform}</span>
                  <div className="flex items-center gap-2">
                    <MessageCircle size={15} />
                    <Send size={15} />
                  </div>
                </div>
                <div className="px-3 py-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-100 border" />
                  <span className="text-[10px] font-semibold">your_account</span>
                </div>
                <div
                  className="aspect-square overflow-hidden bg-gray-50 relative"
                  onTouchStart={(e) => {
                    touchStartXRef.current = e.touches?.[0]?.clientX || null;
                  }}
                  onTouchEnd={(e) => {
                    if (!isCarousel || !touchStartXRef.current) return;
                    const endX = e.changedTouches?.[0]?.clientX || touchStartXRef.current;
                    const diff = endX - touchStartXRef.current;
                    if (Math.abs(diff) < 40) return;
                    if (diff < 0 && previewIndex < carouselMediaUrls.length - 1) setPreviewIndex((i) => i + 1);
                    if (diff > 0 && previewIndex > 0) setPreviewIndex((i) => i - 1);
                  }}
                >
                  {media}
                  {isCarousel && carouselMediaUrls.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((i) => Math.max(i - 1, 0))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/35 text-white flex items-center justify-center"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex((i) => Math.min(i + 1, carouselMediaUrls.length - 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/35 text-white flex items-center justify-center"
                      >
                        <ChevronRight size={14} />
                      </button>
                      <div className="absolute top-2 right-2 text-[9px] px-2 py-1 rounded-full bg-black/40 text-white">
                        {previewIndex + 1}/{carouselMediaUrls.length}
                      </div>
                    </>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <div className="flex items-center gap-3">
                    <MessageCircle size={15} />
                    <Send size={15} />
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    <span className="font-semibold">your_account </span>
                    {caption || 'Your caption preview appears here'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleYoutubeConnect = async () => {
    try {
      const res = await youtubeAPI.getAuthUrl();
      window.location.href = res.data.url;
    } catch (err) {
      // Handled by API interceptor
    }
  };

  const handleYoutubeDisconnect = async () => {
    if (!window.confirm('Disconnect YouTube account?')) return;
    try {
      await youtubeAPI.disconnect();
      toast.success('YouTube disconnected');
      fetchAccounts();
    } catch (err) {
      // Handled by API interceptor
    }
  };

  if (loading) {
    return (
      <div className={`h-full min-h-[500px] flex items-center justify-center ${'bg-slate-50 dark:bg-slate-950'}`}>
        <Loader2 size={28} className="animate-spin text-slate-500" />
      </div>
    );
  }

  if (onboardingStatus && !onboardingStatus.hasIntegration) {
    return (
      <ActionGuard 
        status={onboardingStatus} 
        isDark={isDark} 
        title="Social Hub Locked"
        description="Connect your social media accounts to start publishing and managing your content."
        mode="integration-only"
      />
    );
  }

  return (
    <div className="w-full h-full min-h-[calc(100vh-100px)] max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Connected Accounts Status Bar */}
      {connectedAccounts.length > 0 && (
        <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border overflow-x-auto scrollbar-thin ${
          isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}>Connected</span>
          <div className="flex items-center gap-2 flex-wrap">
            {connectedAccounts.map((acc) => (
              <div key={acc.id} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                isDark ? 'bg-white/5 text-slate-300' : 'bg-slate-50 text-slate-700'
              }`}>
                {PLATFORM_ICON[acc.platform]}
                <span className="truncate max-w-[100px]">{acc.name}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Horizontal Tabs & Header */}
      <div className="flex flex-col gap-6">
        {/* Horizontal Scrollable Tabs */}
        <div className={`flex flex-wrap gap-1.5 pb-3 border-b sticky top-0 z-10 backdrop-blur-md pt-1 -mt-1 ${
          isDark ? 'border-white/10' : 'border-slate-200'
        }`}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  active 
                    ? (isDark ? 'bg-[#FF6A00] text-white shadow-lg shadow-[#FF6A00]/20' : 'bg-[#FF6A00] text-white shadow-lg shadow-[#FF6A00]/20')
                    : (isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
        {activeTab === 'calendar' && (
          <div className="pb-16">
            <SocialCalendarTab />
          </div>
        )}
        {activeTab === 'today' && (
          <div className="pb-16">
            <TodayAnalyticsPanel  />
          </div>
        )}
        {activeTab === 'publish' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            <div className="xl:col-span-7">
              <section className="card">
                <h2 className="text-lg font-semibold mb-6 text-text">Create Post</h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {POST_TYPES.map((t) => {
                    const Icon = t.icon;
                    const active = postType === t.id;
                    const isFbSelected = selectedAccounts.some(a => a.platform === 'facebook');
                    const isYoutubeSelected = selectedAccounts.some(a => a.platform === 'youtube');
                    const isStory = t.id === 'story';
                    const isNotReel = t.id !== 'reel';
                    
                    const fbDisabled = isStory && isFbSelected;
                    const youtubeDisabled = isNotReel && isYoutubeSelected;
                    const disabled = fbDisabled || youtubeDisabled;

                    let tooltip = "";
                    if (fbDisabled) tooltip = "Facebook Page Story is not supported by Meta API";
                    if (youtubeDisabled) tooltip = "Not supported on YouTube (Shorts only)";

                    return (
                      <button
                        key={t.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => setPostType(t.id)}
                        className={`h-11 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                          active 
                            ? 'bg-accent/10 border-accent text-accent' 
                            : 'border-border hover:bg-surface text-text/80'
                        } ${disabled ? 'opacity-40 cursor-not-allowed bg-surface grayscale' : ''}`}
                        title={tooltip}
                      >
                        <Icon size={15} />
                        {t.id === 'reel' && isYoutubeSelected ? 'Short' : t.label}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="label mb-0">Caption</label>
                      <button
                        type="button"
                        onClick={() => setShowAICaptionWriter(v => !v)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          showAICaptionWriter
                            ? 'bg-violet-600 text-white'
                            : 'bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 border border-violet-500/20'
                        }`}
                      >
                        <Sparkles size={13} />
                        {showAICaptionWriter ? 'Close AI Writer' : '✨ AI Caption'}
                      </button>
                    </div>
                    {showAICaptionWriter && (
                      <div className="mb-4">
                        <AICaptionWriter
                          
                          selectedPlatforms={selectedAccounts.map(a => a.platform)}
                          onApply={(generatedCaption) => {
                            setCaption(generatedCaption);
                            setShowAICaptionWriter(false);
                          }}
                        />
                      </div>
                    )}
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      className="input h-36 resize-none"
                      placeholder="Write your post content... or use ✨ AI Caption above"
                    />
                    <div className={`flex justify-end mt-1 text-xs ${caption.length > 2000 ? 'text-error' : 'text-text/50'}`}>
                      {caption.length} chars
                    </div>
                  </div>

                  {/* YouTube Specific Options */}
                  {selectedAccounts.some(a => a.platform === 'youtube') && (
                    <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
                      <div className="flex items-center gap-2 font-semibold text-sm text-red-500">
                        <Youtube size={16} />
                        <span>YouTube Shorts Settings</span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="label text-[11px] uppercase tracking-wider text-red-500/80">Short Title (max 100)</label>
                          <input 
                            type="text"
                            value={youtubeOptions.title}
                            onChange={(e) => setYoutubeOptions(prev => ({ ...prev, title: e.target.value }))}
                            placeholder={caption.substring(0, 50) || "Video Title"}
                            className="input h-11"
                          />
                        </div>
                        
                        <div>
                          <label className="label text-[11px] uppercase tracking-wider text-red-500/80">Description</label>
                          <textarea 
                            value={youtubeOptions.description}
                            onChange={(e) => setYoutubeOptions(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Detailed description for YouTube..."
                            className="input h-20 resize-none"
                          />
                        </div>

                        <div>
                          <label className="label text-[11px] uppercase tracking-wider text-red-500/80">First Comment</label>
                          <input 
                            type="text"
                            value={youtubeOptions.firstComment}
                            onChange={(e) => setYoutubeOptions(prev => ({ ...prev, firstComment: e.target.value }))}
                            placeholder="Write a comment to be pinned or added first..."
                            className="input h-11"
                          />
                          <p className="text-[10px] mt-1 italic text-red-500/60">* Comment will be added automatically after upload.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="label mb-2">Media</label>
                    <div className="rounded-2xl border border-border bg-surface p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {MEDIA_INPUT_TYPES.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setMediaInputType(item.id)}
                            className={`h-11 rounded-xl border text-sm font-medium transition-all duration-200 ${
                              mediaInputType === item.id
                                ? 'border-accent bg-accent/10 text-accent'
                                : 'border-border text-text/70 hover:bg-background'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {mediaInputType === 'upload' && (
                        <label className="h-12 px-4 rounded-xl border border-dashed border-border bg-background flex items-center justify-center gap-2 text-sm font-medium cursor-pointer hover:border-accent hover:text-accent transition-all duration-200">
                          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                          Upload Media
                          <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,video/*" />
                        </label>
                      )}

                      {mediaInputType === 'link' && (
                        <div className="relative">
                          <LinkIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text/40" />
                          <input
                            value={mediaUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMediaUrl(val);
                              setMediaType(/\.(mp4|mov|avi|wmv|webm)$/i.test(val) ? 'video' : 'image');
                            }}
                            className="input pl-10 h-12"
                            placeholder="Paste media URL"
                          />
                        </div>
                      )}

                      {mediaInputType === 'ai' && (
                        <div className="space-y-4">
                          <textarea
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Describe the image you want to generate..."
                            className="input h-24 resize-none"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <select
                              value={aiStyle}
                              onChange={(e) => setAiStyle(e.target.value)}
                              className={`h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                                'bg-white border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-white/10 dark:text-slate-100'
                              }`}
                            >
                              {AI_STYLE_OPTIONS.map((style) => (
                                <option key={style} value={style}>
                                  {style}
                                </option>
                              ))}
                            </select>
                            <select
                              value={aiAspectRatio}
                              onChange={(e) => setAiAspectRatio(e.target.value)}
                              className={`h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                                'bg-white border-slate-300 text-slate-900 dark:bg-slate-900 dark:border-white/10 dark:text-slate-100'
                              }`}
                            >
                              {AI_ASPECT_OPTIONS.map((ratio) => (
                                <option key={ratio.value} value={ratio.value}>
                                  {ratio.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            onClick={handleGenerateAiImage}
                            disabled={aiGenerating}
                            className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-sm font-semibold flex items-center justify-center gap-2"
                          >
                            {aiGenerating ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                            {aiGenerating ? 'Generating...' : 'Generate'}
                          </button>

                          {generatedImage?.url && (
                            <div className={`rounded-xl border p-3 transition-all ${'border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950'}`}>
                              <img
                                src={generatedImage.url}
                                alt="Generated with AI"
                                className={`w-full max-h-64 object-cover rounded-lg border ${'border-slate-200 dark:border-white/10'}`}
                              />
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={handleUseGeneratedImage}
                                  className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                                >
                                  Use This Image
                                </button>
                                <button
                                  type="button"
                                  onClick={handleGenerateAiImage}
                                  disabled={aiGenerating}
                                  className={`h-9 rounded-lg border text-xs font-semibold transition-all ${'border-slate-300 hover:bg-slate-100 text-slate-700 bg-white dark:border-white/10 dark:hover:bg-white/5 dark:text-slate-300 dark:bg-slate-900'}`}
                                >
                                  Regenerate
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {postType === 'carousel' && (
                      <div className="mt-3 space-y-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!mediaUrl.trim()) return;
                            setCarouselMediaUrls((prev) => [...prev, mediaUrl.trim()]);
                            setMediaUrl('');
                          }}
                          className={`h-9 px-3 rounded-lg border text-xs font-semibold transition-all ${'border-slate-300 hover:bg-slate-50 text-slate-700 bg-white dark:border-white/10 dark:hover:bg-white/5 dark:text-slate-300 dark:bg-slate-900'}`}
                        >
                          Add URL to Carousel
                        </button>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {carouselMediaUrls.map((url, idx) => (
                            <div key={`${url}-${idx}`} className={`relative aspect-square rounded-lg border overflow-hidden ${'border-slate-200 dark:border-white/10'}`}>
                              {isVideoUrl(url) ? (
                                <video src={url} className="w-full h-full object-cover" />
                              ) : (
                                <img src={url} className="w-full h-full object-cover" alt={`carousel-${idx + 1}`} />
                              )}
                              <button
                                type="button"
                                onClick={() => setCarouselMediaUrls((prev) => prev.filter((_, i) => i !== idx))}
                                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 text-white text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Scheduling Section */}
                  <div className={`pt-4 border-t ${'border-slate-100 dark:border-white/10'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="text-sm font-medium">Publishing Schedule</span>
                      </div>
                      <div className={`flex p-1 rounded-lg transition-all ${'bg-slate-100 dark:bg-slate-950'}`}>
                        <button
                          type="button"
                          onClick={() => setPublishMode('instant')}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all duration-200 ${
                            publishMode === 'instant' 
                              ? ('bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400 dark:shadow-sm') 
                              : ('text-slate-500 dark:text-slate-400 dark:hover:text-white')
                          }`}
                        >
                          NOW
                        </button>
                        <button
                          type="button"
                          onClick={() => setPublishMode('scheduled')}
                          className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all duration-200 ${
                            publishMode === 'scheduled' 
                              ? ('bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400 dark:shadow-sm') 
                              : ('text-slate-500 dark:text-slate-400 dark:hover:text-white')
                          }`}
                        >
                          SCHEDULE
                        </button>
                      </div>
                    </div>

                    {publishMode === 'scheduled' && (
                      <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className={`block text-[11px] font-semibold uppercase mb-1.5 ml-1 ${'text-slate-500 dark:text-slate-400'}`}>
                          Select Date & Time
                        </label>
                        <input
                          type="datetime-local"
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          className={`w-full h-11 px-4 rounded-xl border focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm outline-none ${
                            'bg-slate-50 border-slate-200 text-slate-900 dark:bg-slate-950 dark:border-white/10 dark:text-slate-100'
                          }`}
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handlePostSubmit}
                    disabled={publishing || selectedAccountIds.length === 0 || (publishMode === 'scheduled' && !scheduledAt)}
                    className={`w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                      'disabled:bg-slate-200 disabled:text-slate-400 shadow-lg shadow-blue-200 dark:disabled:bg-slate-850 dark:disabled:text-slate-600'
                    }`}
                  >
                    {publishing ? <Loader2 size={16} className="animate-spin" /> : publishMode === 'scheduled' ? <Calendar size={16} /> : <Send size={16} />}
                    {publishing ? 'Processing...' : publishMode === 'scheduled' ? 'Schedule Post' : 'Publish Now'}
                  </button>
                </div>
              </section>
            </div>

            <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-6">
              <section className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${'bg-white border-slate-200 dark:bg-slate-900 dark:border-white/10'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold">{showSidebarPreview ? 'Preview (iPhone 15 Pro)' : 'Select Platforms'}</h3>
                  <div className="flex items-center gap-2">
                    {!showSidebarPreview && (
                      <button
                        onClick={() =>
                          setSelectedAccountIds(
                            selectedAccountIds.length === connectedAccounts.length ? [] : connectedAccounts.map((a) => a.id)
                          )
                        }
                        className="text-xs font-semibold text-blue-600"
                      >
                        {selectedAccountIds.length === connectedAccounts.length ? 'Clear' : 'Select All'}
                      </button>
                    )}
                    <button
                      onClick={() => setShowSidebarPreview((v) => !v)}
                      className={`h-8 px-3 rounded-lg text-xs font-semibold transition ${
                        showSidebarPreview ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white'
                      } ${previewNudge && !showSidebarPreview ? 'ring-2 ring-blue-300 animate-pulse' : ''}`}
                    >
                      {showSidebarPreview ? 'Show Platforms' : 'Open Preview'}
                    </button>
                  </div>
                </div>

                {showSidebarPreview ? (
                  <div>
                    <div className="flex gap-1 mb-4">
                      {['instagram', 'facebook'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setPreviewPlatform(p)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-200 ${
                            previewPlatform === p 
                              ? 'bg-blue-600 text-white' 
                              : ('bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10')
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-center">{renderIphonePreview()}</div>
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto pr-1">
                    {/* Instagram video warning banner (removed because it is supported) */}
                    {connectedAccounts.map((acc) => {
                      const selected = selectedAccountIds.includes(acc.id);
                      return (
                        <button
                          key={acc.id}
                          onClick={() => {
                            setSelectedAccountIds((prev) =>
                              prev.includes(acc.id) ? prev.filter((id) => id !== acc.id) : [...prev, acc.id]
                            );
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition-all ${
                            selected
                              ? ('border-blue-300 bg-blue-50 dark:border-blue-500 dark:bg-blue-500/10')
                              : ('border-slate-200 hover:bg-slate-50 bg-white dark:border-white/10 dark:hover:bg-white/5 dark:bg-slate-900/50')
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${'border-slate-300 bg-white dark:border-white/20 dark:bg-slate-950'}`}>
                              {selected && <CheckCircle2 size={13} className="text-blue-600" />}
                            </div>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${'bg-slate-100 dark:bg-slate-950'}`}>
                              {PLATFORM_ICON[acc.platform]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium truncate ${'text-slate-800 dark:text-slate-200'}`}>{acc.name}</p>
                              <p className={`text-[11px] uppercase ${'text-slate-500 dark:text-slate-400'}`}>{acc.platform}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

            </div>
          </div>
        )}

        {activeTab === 'copilot' && (
          <BrandCopilotTab  />
        )}

        {activeTab === 'feed' && (
          <div className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${'bg-white border-slate-200 dark:bg-slate-900 dark:border-white/10'}`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-semibold">Content Library</h2>
              <div className="flex flex-wrap gap-2">
                {['all', 'scheduled', 'failed', 'instagram', 'facebook', 'youtube'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setFeedFilter(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all duration-200 ${
                      feedFilter === tab 
                        ? 'bg-blue-600 text-white' 
                        : ('bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10')
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`h-8 rounded-lg border px-3 text-xs transition-all ${
                    'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 dark:bg-slate-950 dark:border-white/10 dark:text-slate-100 dark:placeholder:text-slate-500'
                  }`}
                  placeholder="Search caption"
                />
              </div>
            </div>

            {loadingFeed ? (
              <div className="py-20 flex justify-center">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : (
              <>
                {/* Analytics Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${'bg-white border-slate-200 dark:bg-slate-950 dark:border-white/10'}`}>
                    <div>
                      <p className={`text-xs font-semibold uppercase ${'text-slate-500 dark:text-slate-400'}`}>Facebook Posts</p>
                      <p className={`text-2xl font-bold ${'text-slate-900 dark:text-slate-100'}`}>{filteredFeed.filter(p => p.platform === 'facebook').length}</p>
                    </div>
                    <Facebook className="text-blue-500" size={24} />
                  </div>
                  <div className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${'bg-white border-slate-200 dark:bg-slate-950 dark:border-white/10'}`}>
                    <div>
                      <p className={`text-xs font-semibold uppercase ${'text-slate-500 dark:text-slate-400'}`}>Instagram Posts</p>
                      <p className={`text-2xl font-bold ${'text-slate-900 dark:text-slate-100'}`}>{filteredFeed.filter(p => p.platform === 'instagram').length}</p>
                    </div>
                    <Instagram className="text-pink-500" size={24} />
                  </div>
                  <div className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${'bg-white border-slate-200 dark:bg-slate-950 dark:border-white/10'}`}>
                    <div>
                      <p className={`text-xs font-semibold uppercase ${'text-slate-500 dark:text-slate-400'}`}>YouTube Videos</p>
                      <p className={`text-2xl font-bold ${'text-slate-900 dark:text-slate-100'}`}>{filteredFeed.filter(p => p.platform === 'youtube').length}</p>
                    </div>
                    <Youtube className="text-red-600" size={24} />
                  </div>
                  <div className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${'bg-red-50 border-red-200 text-red-900 dark:bg-rose-950/20 dark:border-rose-500/20 dark:text-rose-200'}`}>
                    <div>
                      <p className={`text-xs font-semibold uppercase ${'text-red-600 dark:text-rose-400'}`}>Duplicates Detected</p>
                      <p className={`text-2xl font-bold ${'text-red-700 dark:text-rose-300'}`}>{duplicateAlerts.length}</p>
                    </div>
                    <AlertCircle className="text-red-500" size={24} />
                  </div>
                </div>

                {duplicateAlerts.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-red-600">
                      <AlertCircle size={18} />
                      Duplicate Posts Detection
                    </h3>
                    <div className="space-y-3">
                      {duplicateAlerts.map((dup, idx) => (
                        <div key={idx} className={`border rounded-xl p-4 flex flex-col md:flex-row gap-4 items-start md:items-center shadow-sm transition-all duration-300 ${'bg-red-50 border-red-200 dark:bg-rose-950/10 dark:border-rose-500/10 dark:text-rose-200'}`}>
                          <div className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border ${'bg-slate-200 border-slate-200 dark:bg-slate-900 dark:border-white/10'}`}>
                            {dup.mediaUrl ? (
                              /\.(mp4|mov|webm)/i.test(dup.mediaUrl) ? <video src={dup.mediaUrl} className="w-full h-full object-cover" /> : <img src={dup.mediaUrl} className="w-full h-full object-cover" />
                            ) : <ImageIcon className="w-full h-full p-4 text-slate-400" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase border border-red-200">{dup.platform}</span>
                              <span className={`text-sm font-semibold ${'text-red-900 dark:text-rose-300'}`}>{dup.originalPosts.length} Duplicates Found</span>
                            </div>
                            <p className={`text-xs line-clamp-1 max-w-lg mb-2 ${'text-red-700 dark:text-rose-400'}`}>{dup.caption || 'No caption'}</p>
                            <div className="flex gap-2 flex-wrap">
                              {dup.originalPosts.map((p, i) => (
                                <div key={i} className={`text-[10px] border px-2 py-1 rounded flex items-center gap-1.5 shadow-sm ${'bg-white border-red-200 text-slate-600 dark:bg-slate-950 dark:border-rose-500/20 dark:text-rose-300'}`}>
                                  <span className="font-medium capitalize">{p.platform} ({p.source === 'dashboard' ? 'Dashboard' : 'Manual'}) - {new Date(p.timestamp).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                                  {i === 0 && <span className="text-emerald-600 font-bold ml-1">(Latest)</span>}
                                  {i !== 0 && (
                                    <button onClick={() => handleDeletePostGroup({ platforms: [p.platform], originalPosts: [p] })} className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0.5 rounded transition ml-1" title="Delete this duplicate">
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => {
                                const toDelete = dup.originalPosts.slice(1);
                                toDelete.forEach(p => handleDeletePostGroup({ platforms: [p.platform], originalPosts: [p] }));
                              }}
                              className={`border text-xs font-semibold px-3 py-2 rounded-lg transition-all shadow-sm ${'bg-white border-red-300 text-red-600 hover:bg-red-50 dark:bg-rose-950/30 dark:border-rose-500/30 dark:text-rose-400 dark:hover:bg-rose-950/50'}`}
                            >
                              Keep Latest Only
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <h3 className={`text-base font-semibold mb-4 ${'text-slate-800 dark:text-slate-200'}`}>Unified Published Posts</h3>

                {groupedFeed.length === 0 ? (
                  <div className={`py-16 text-center text-sm rounded-xl border border-dashed transition-all duration-300 ${'text-slate-500 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-950 dark:border-white/10'}`}>No unified posts found.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {groupedFeed.map((post, idx) => (
                  <div key={post.id || idx} className={`rounded-2xl border hover:z-10 relative cursor-pointer hover:shadow-lg transition-all duration-300 ${'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900'}`} onClick={() => setViewingInsights(post)}>
                    <div className={`aspect-[4/5] overflow-hidden relative rounded-t-[15px] transition-all duration-300 ${'bg-slate-100 dark:bg-slate-950'}`}>
                      {post.mediaUrl ? (
                        (post.platform === 'youtube' || (post.type !== 'VIDEO' && post.type !== 'video' && post.type !== 'reel')) ? (
                          <img src={post.mediaUrl} className="w-full h-full object-cover" alt="post" />
                        ) : (
                          <video src={post.mediaUrl} className="w-full h-full object-cover" />
                        )
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs p-4 text-center">{post.caption}</div>
                      )}
                    </div>                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          {post.platforms.map(p => {
                            const execution = post.executions?.find(e => e.platform === p);
                            // If it's not a job (meaning it came from platform directly), it's already success.
                            const isJob = !!post.isJob;
                            const isFailed = isJob && execution?.status === 'failed';
                            const isSuccess = !isJob || execution?.status === 'success';
                            const isRetrying = isJob && (execution?.status === 'retrying' || (retryingPlatform.jobId === post.jobId && retryingPlatform.platform === p));
                            const isWorking = isJob && !isSuccess && !isFailed;
                            
                            const currentStep = getPipelineStatus(execution?.status);

                            return (
                              <div key={p} className="relative group">
                                <span className={`flex items-center justify-center w-7 h-7 rounded-full border-2 transition ${
                                  isSuccess ? ('bg-emerald-50 border-emerald-500 shadow-sm shadow-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:shadow-sm dark:shadow-emerald-950/20') : 
                                  isFailed ? ('bg-red-50 border-red-500 shadow-sm shadow-red-100 dark:bg-red-500/10 dark:border-red-500/30 dark:shadow-sm dark:shadow-red-950/20') : 
                                  isWorking ? ('bg-blue-50 border-blue-500 animate-pulse dark:bg-blue-500/10 dark:border-blue-500/30 dark:animate-pulse') :
                                  ('bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-white/10')
                                }`} title={`${p}: ${execution?.humanMessage || execution?.status || (isSuccess ? 'Published' : 'Waiting...')}`}>
                                  {PLATFORM_ICON[p]}
                                  {isFailed && (
                                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center border border-white">
                                      <AlertCircle size={9} className="text-white" />
                                    </div>
                                  )}
                                  {isWorking && (
                                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center border border-white">
                                      <Loader2 size={9} className="text-white animate-spin" />
                                    </div>
                                  )}
                                </span>
                                
                                {isFailed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRetryPlatform(post.jobId, p);
                                    }}
                                    disabled={isRetrying}
                                    className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center border border-white text-white hover:bg-blue-700 transition shadow-sm z-10"
                                    title="Retry this platform"
                                  >
                                    {isRetrying ? <Loader2 size={8} className="animate-spin" /> : <RefreshCw size={8} />}
                                  </button>
                                )}                               {/* Status Pipeline Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                  <div className={`p-3 rounded-xl shadow-xl w-48 border transition-all ${'bg-slate-900 text-white border-slate-700 dark:bg-slate-900 dark:text-white dark:border-slate-700'}`}>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-700 pb-1">
                                      {p} {isJob ? 'Status Pipeline' : 'Status'}
                                    </p>
                                    <div className="space-y-1.5">
                                      {isJob ? PIPELINE_STEPS.map((step, sIdx) => {
                                        const StepIcon = step.icon;
                                        const stepIndex = PIPELINE_STEPS.findIndex(s => s.id === currentStep);
                                        const isDone = sIdx < stepIndex || isSuccess;
                                        const isActive = step.id === currentStep && !isSuccess;
                                        
                                        return (
                                          <div key={step.id} className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                              isDone ? 'bg-emerald-500 text-white' : 
                                              isActive ? 'bg-blue-500 text-white animate-pulse' : 
                                              'bg-slate-700 text-slate-500'
                                            }`}>
                                              {isDone ? <CheckCircle2 size={10} /> : <StepIcon size={10} />}
                                            </div>
                                            <span className={`text-[10px] ${isActive ? 'text-blue-400 font-bold' : isDone ? 'text-emerald-400' : 'text-slate-500'}`}>
                                              {step.label}
                                            </span>
                                          </div>
                                        );
                                      }) : null}
                                      {isSuccess && (
                                        <div className="flex items-center gap-2 pt-1 mt-1 border-t border-slate-700">
                                          <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                                            <CheckCircle2 size={10} />
                                          </div>
                                          <span className="text-[10px] text-emerald-400 font-bold">Completed</span>
                                        </div>
                                      )}
                                    </div>
                                    {execution?.attempts > 1 && (
                                      <p className="text-[9px] mt-2 text-blue-400 italic">Attempt {execution.attempts}/3</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {(post.mode === 'scheduled' || post.overallStatus === 'queued') && (
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all duration-200 ${'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'}`}>
                              Scheduled
                            </span>
                          )}
                          {(post.overallStatus === 'failed' || post.overallStatus === 'partially_failed') && (
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all duration-200 ${'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400'}`}>
                              {post.overallStatus.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {(post.mode === 'scheduled' || post.overallStatus === 'queued') ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditJob(post); }}
                              className={`p-1.5 rounded-md transition-all duration-200 ${'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20'}`}
                              title="Edit Scheduled Post"
                            >
                              <Share2 size={14} className="rotate-90" />
                            </button>
                          ) : post.permalink ? (
                            <a href={post.permalink} onClick={e => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className={`p-1.5 rounded-md transition-all duration-200 ${'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
                              <Eye size={14} />
                            </a>
                          ) : null}
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCrossPost(post); }}
                            className={`p-1.5 rounded-md transition-all duration-200 ${'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20'}`}
                            title="Cross-post to other platforms"
                          >
                            <RefreshCw size={14} />
                          </button>
                          
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePostGroup(post); }}
                            disabled={deletingPostId === (post.id || post.originalPosts?.[0]?.id)}
                            className={`p-1.5 rounded-md transition-all duration-200 ${'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20'}`}
                          >
                            {deletingPostId === (post.id || post.originalPosts?.[0]?.id) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                      <p className={`text-xs line-clamp-2 mb-2 ${'text-slate-600 dark:text-slate-300'}`}>{post.caption}</p>
                      
                      {/* Warnings & Fallbacks */}
                      {post.compatibility?.warnings?.length > 0 && (
                        <div className={`mb-2 p-2 rounded-lg border transition-all duration-300 ${'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-500/20'}`}>
                          <div className="flex items-start gap-1.5">
                            <Info size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
                            <div className="space-y-0.5">
                              {post.compatibility.warnings.map((w, i) => (
                                <p key={i} className={`text-[9px] leading-tight ${'text-amber-700 dark:text-amber-400'}`}>
                                  <span className="font-bold uppercase tracking-tighter mr-1">{w.platform}:</span>
                                  {w.message}
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Error & Retry Feedback */}
                      {post.executions?.some(e => e.status === 'failed') && (
                        <div className={`mb-2 p-2 rounded-lg border transition-all duration-300 ${'bg-red-50 border-red-100 dark:bg-rose-950/20 dark:border-rose-500/20'}`}>
                          <div className="flex items-start gap-1.5">
                            <AlertCircle size={12} className="text-red-600 mt-0.5 flex-shrink-0" />
                            <div className="space-y-1">
                              {post.executions.filter(e => e.status === 'failed').map((e, i) => (
                                <div key={i}>
                                  <p className={`text-[10px] font-bold uppercase tracking-tight leading-none mb-0.5 ${'text-red-600 dark:text-rose-400'}`}>
                                    {e.platform} Failed
                                  </p>
                                  <p className={`text-[10px] leading-snug ${'text-red-500 dark:text-rose-300'}`}>
                                    {e.humanMessage || 'Temporary issue, please retry.'}
                                  </p>
                                  {e.attempts > 1 && (
                                    <p className={`text-[9px] italic ${'text-red-400 dark:text-rose-500/80'}`}>
                                      Tried {e.attempts} times before stopping.
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <p className={`text-[11px] flex items-center gap-1 transition-all ${'text-slate-400 dark:text-slate-400'}`}>
                        <Calendar size={12} />
                        {(post.mode === 'scheduled' || post.overallStatus === 'queued') ? 'Scheduled: ' : 'Posted: '}
                        {new Date(post.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </>
            )}
          </div>
        )}

        {activeTab === 'accounts' && (
          <div className={`rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${'bg-white border-slate-200 dark:bg-slate-900 dark:border-white/10'}`}>
            <h2 className="text-lg font-semibold mb-5">Connected Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {connectedAccounts.map((acc) => (
                <div key={acc.id} className={`rounded-xl border p-4 transition-all duration-300 ${'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950/45'}`}>
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${'bg-slate-100 dark:bg-slate-900'}`}>{PLATFORM_ICON[acc.platform]}</div>
                    <span className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-md transition-all duration-300 ${'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'}`}>Connected</span>
                  </div>
                  <p className={`mt-3 text-sm font-semibold ${'text-slate-800 dark:text-slate-200'}`}>{acc.name}</p>
                  <p className={`text-xs uppercase mt-0.5 ${'text-slate-500 dark:text-slate-400'}`}>{acc.platform} · {acc.type}</p>
                </div>
              ))}
            </div>
            {connectedAccounts.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-slate-500 mb-3">No connected accounts yet.</p>
                <button onClick={() => navigate('/app/integrations')} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">
                  Connect Platforms
                </button>
              </div>
            )}

            <div className={`mt-8 pt-8 border-t transition-colors duration-300 ${'border-slate-100 dark:border-white/10'}`}>
              <h3 className={`text-sm font-bold mb-4 uppercase tracking-wider transition-colors duration-300 ${'text-slate-800 dark:text-slate-200'}`}>Add New Connection</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <button onClick={() => navigate('/app/integrations')} className={`flex items-center gap-3 p-4 rounded-xl border border-dashed transition-all duration-300 group ${
                   'border-slate-300 hover:border-blue-400 hover:bg-blue-50 dark:border-slate-800 dark:hover:border-blue-500 dark:hover:bg-blue-500/10'
                 }`}>
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                     'bg-blue-50 group-hover:bg-blue-100 dark:bg-blue-500/10 dark:group-hover:bg-blue-500/20'
                   }`}><Facebook className="text-blue-600" size={20} /></div>
                   <div className="text-left">
                     <p className={`text-sm font-bold transition-colors duration-300 ${'text-slate-800 dark:text-slate-200'}`}>Meta</p>
                     <p className={`text-[10px] transition-colors duration-300 ${'text-slate-500 dark:text-slate-400'}`}>Facebook & Instagram</p>
                   </div>
                 </button>
                 
                 <button onClick={handleYoutubeConnect} className={`flex items-center gap-3 p-4 rounded-xl border border-dashed transition-all duration-300 group ${
                   'border-red-300 hover:border-red-400 hover:bg-red-50 dark:border-red-900 dark:hover:border-red-500 dark:hover:bg-red-500/10'
                 }`}>
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                     'bg-red-50 group-hover:bg-red-100 dark:bg-red-500/10 dark:group-hover:bg-red-500/20'
                   }`}><Youtube className="text-red-600" size={20} /></div>
                   <div className="text-left">
                     <p className={`text-sm font-bold transition-colors duration-300 ${'text-slate-800 dark:text-slate-200'}`}>YouTube</p>
                     <p className={`text-[10px] transition-colors duration-300 ${'text-slate-500 dark:text-slate-400'}`}>Connect YouTube Shorts</p>
                   </div>
                 </button>
                 
                 <button onClick={handleLinkedinConnect} className={`flex items-center gap-3 p-4 rounded-xl border border-dashed transition-all duration-300 group ${
                   'border-blue-400 hover:border-blue-600 hover:bg-blue-50 dark:border-blue-900/50 dark:hover:border-blue-500 dark:hover:bg-blue-500/10'
                 }`}>
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${
                     'bg-blue-50 group-hover:bg-blue-100 dark:bg-blue-500/10 dark:group-hover:bg-blue-500/20'
                   }`}><Linkedin className="text-[#0077b5]" size={20} /></div>
                   <div className="text-left">
                     <p className={`text-sm font-bold transition-colors duration-300 ${'text-slate-800 dark:text-slate-200'}`}>LinkedIn</p>
                     <p className={`text-[10px] transition-colors duration-300 ${'text-slate-500 dark:text-slate-400'}`}>Connect Personal Profile</p>
                   </div>
                 </button>

                 <div className={`flex items-center gap-3 p-4 rounded-xl border border-dashed opacity-50 cursor-not-allowed grayscale transition-colors duration-300 ${
                   'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50'
                 }`}>
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-300 ${'bg-slate-100 dark:bg-slate-850'}`}><Share2 className="text-slate-400" size={20} /></div>
                   <div className="text-left">
                     <p className={`text-sm font-bold transition-colors duration-300 ${'text-slate-750 dark:text-slate-400'}`}>Coming Soon</p>
                     <p className="text-[10px] text-slate-500">Twitter & TikTok</p>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'yt_automation' && (
          <div className={`rounded-3xl border p-12 text-center max-w-2xl mx-auto shadow-sm transition-all duration-300 ${'bg-white border-slate-200 dark:bg-slate-900 dark:border-white/10'}`}>
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 ${'bg-red-50 dark:bg-red-500/10'}`}>
              <Youtube size={40} className="text-red-600" />
            </div>
            <h2 className={`text-2xl font-black mb-3 ${'text-slate-800 dark:text-slate-100'}`}>YouTube Automation Moved</h2>
            <p className={`mb-8 leading-relaxed ${'text-slate-500 dark:text-slate-400'}`}>
              We've moved the YouTube Comment AI & Auto-Reply system to the 
              <strong> Integrations</strong> dashboard for better management and focus.
            </p>
            <button 
              onClick={() => navigate('/app/integrations')}
              className={`px-8 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all flex items-center justify-center gap-2 mx-auto ${
                'shadow-lg shadow-red-100 dark:shadow-none'
              }`}
            >
              Go to Automation Dashboard
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {activeTab === 'profile' && (
          <form onSubmit={handleProfileUpdate} className={`rounded-2xl border p-5 sm:p-6 max-w-3xl transition-all duration-300 ${'bg-white border-slate-200 dark:bg-slate-900 dark:border-white/10'}`}>
            <h2 className="text-lg font-semibold mb-5">Profile Sync</h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-2 ${'text-slate-600 dark:text-slate-300'}`}>Business Name</label>
                <input
                  value={profileData.name}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                  className={`w-full h-11 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                    'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 dark:bg-slate-950 dark:border-white/10 dark:text-slate-100 dark:placeholder:text-slate-500'
                  }`}
                  placeholder="Your brand name"
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-2 ${'text-slate-600 dark:text-slate-300'}`}>Description</label>
                <textarea
                  value={profileData.description}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, description: e.target.value }))}
                  className={`w-full h-32 resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all ${
                    'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 dark:bg-slate-950 dark:border-white/10 dark:text-slate-100 dark:placeholder:text-slate-500'
                  }`}
                  placeholder="Short business description"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={publishing || selectedAccounts.length === 0}
              className={`mt-5 h-11 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all ${
                'disabled:bg-slate-300 dark:disabled:bg-slate-850 dark:disabled:text-slate-600'
              }`}
            >
              {publishing ? 'Syncing...' : 'Sync Across Selected Platforms'}
            </button>
          </form>
        )}

      {/* Insights Modal */}
      {viewingInsights && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setViewingInsights(null)}>
          <div className={`rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl transition-all duration-300 ${'bg-white text-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:border dark:border-white/10'}`} onClick={e => e.stopPropagation()}>
            <div className={`sticky top-0 backdrop-blur-md px-6 py-4 border-b flex items-center justify-between z-10 transition-all duration-300 ${'bg-white/80 border-slate-100 dark:bg-slate-900/80 dark:border-white/10'}`}>
              <h3 className={`text-lg font-bold ${'text-slate-900 dark:text-slate-100'}`}>Post Insights</h3>
              <button onClick={() => setViewingInsights(null)} className={`p-2 rounded-full transition-colors ${'hover:bg-slate-100 text-slate-500 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white'}`}><X size={20}/></button>
            </div>
            <div className="p-6">
              <div className={`flex gap-4 mb-6 p-4 rounded-xl border transition-all duration-300 ${'bg-slate-50 border-slate-100 dark:bg-slate-950 dark:border-white/10'}`}>
                 <div className={`w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 ${'bg-slate-200 dark:bg-slate-800'}`}>
                    {viewingInsights.mediaUrl ? (
                      viewingInsights.type === 'VIDEO' || viewingInsights.type === 'video' || viewingInsights.type === 'reel' ? (
                        <video src={viewingInsights.mediaUrl} className="w-full h-full object-cover" />
                      ) : (
                        <img src={viewingInsights.mediaUrl} className="w-full h-full object-cover" />
                      )
                    ) : <div className="w-full h-full flex items-center justify-center p-2 text-[8px] text-slate-500">{viewingInsights.caption}</div>}
                 </div>
                 <div className="flex-1 overflow-hidden">
                    <p className={`text-sm line-clamp-3 mb-2 ${'text-slate-700 dark:text-slate-300'}`}>{viewingInsights.caption}</p>
                    <p className="text-xs font-semibold text-slate-500">{new Date(viewingInsights.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                 </div>
              </div>
              
              {loadingInsights ? (
                <div className="py-12 flex flex-col items-center justify-center">
                   <Loader2 className="animate-spin text-emerald-500 mb-2" size={28} />
                   <p className={`text-sm font-medium ${'text-slate-500 dark:text-slate-400'}`}>Fetching analytics from platforms...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {viewingInsights.platforms.map(p => {
                    const data = insightsData[p];
                    if (!data) return null;
                    return (
                      <div key={p} className={`border rounded-xl p-4 shadow-sm transition-all duration-300 ${'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950'}`}>
                         <div className="flex items-center gap-2 mb-4">
                           <span className="w-6 h-6">{PLATFORM_ICON[p]}</span>
                           <span className={`font-bold capitalize ${'text-slate-800 dark:text-slate-200'}`}>{p} Analytics</span>
                           {data.error && <span className="text-[10px] uppercase font-bold text-red-600 ml-auto bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">Data unavailable</span>}
                         </div>
                         {!data.error && (
                           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              <div className={`rounded-lg p-3 text-center border transition-all duration-300 ${'bg-slate-50 border-slate-100 dark:bg-slate-900/60 dark:border-white/5'}`}>
                                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Likes</div>
                                <div className={`text-xl font-black ${'text-slate-800 dark:text-slate-100'}`}>{data.likes ?? '-'}</div>
                              </div>
                              <div className={`rounded-lg p-3 text-center border transition-all duration-300 ${'bg-slate-50 border-slate-100 dark:bg-slate-900/60 dark:border-white/5'}`}>
                                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Comments</div>
                                <div className={`text-xl font-black ${'text-slate-800 dark:text-slate-100'}`}>{data.comments ?? '-'}</div>
                              </div>
                              <div className={`rounded-lg p-3 text-center border transition-all duration-300 ${'bg-slate-50 border-slate-100 dark:bg-slate-900/60 dark:border-white/5'}`}>
                                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Shares</div>
                                <div className={`text-xl font-black ${'text-slate-800 dark:text-slate-100'}`}>{data.shares ?? '-'}</div>
                              </div>
                              <div className={`rounded-lg p-3 text-center border transition-all duration-300 ${'bg-slate-50 border-slate-100 dark:bg-slate-900/60 dark:border-white/5'}`}>
                                <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Views</div>
                                <div className={`text-xl font-black ${'text-slate-800 dark:text-slate-100'}`}>{data.views ?? '-'}</div>
                              </div>
                           </div>
                         )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HeartIcon() {
  return (
    <div className="flex flex-col items-center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21s-6.716-4.308-9.193-8.28C.33 8.75 2.289 4 6.564 4c2.346 0 4.053 1.278 5.436 3.137C13.383 5.278 15.09 4 17.436 4 21.71 4 23.67 8.75 21.193 12.72 18.716 16.692 12 21 12 21z" />
      </svg>
    </div>
  );
}
