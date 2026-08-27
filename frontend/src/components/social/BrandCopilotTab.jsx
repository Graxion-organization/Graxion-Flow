import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Calendar, 
  Layers, 
  FileText, 
  HelpCircle, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Image as ImageIcon, 
  Video, 
  Clock, 
  Trash2, 
  Eye, 
  Plus, 
  X,
  Compass,
  ArrowRight,
  TrendingUp,
  Sliders,
  AlertCircle,
  Upload,
  Search,
  Check,
  Copy,
  Info,
  Flame,
  Briefcase,
  Smile,
  BookOpen,
  RefreshCw,
  Zap,
  Globe
} from 'lucide-react';
import { marketingCopilotAPI, socialHubAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const PLATFORMS_LIST = [
  { id: 'instagram', label: 'Instagram', color: 'from-pink-500 to-purple-600', icon: 'I' },
  { id: 'facebook', label: 'Facebook', color: 'from-blue-600 to-blue-800', icon: 'F' },
  { id: 'linkedin', label: 'LinkedIn', color: 'from-sky-700 to-blue-900', icon: 'L' },
  { id: 'youtube', label: 'YouTube Shorts', color: 'from-red-500 to-red-700', icon: 'Y' }
];

const MODEL_OPTIONS = [
  { value: 'B2C', label: 'B2C Business', desc: 'Sell products/services directly to retail consumers', icon: Smile },
  { value: 'B2B', label: 'B2B Company', desc: 'Provide products/services to other corporations', icon: Briefcase },
  { value: 'Local Service', label: 'Local Store', desc: 'Cafe, Gym, Salon, or physical local storefront', icon: Compass },
  { value: 'E-commerce', label: 'E-Commerce Store', desc: 'Online digital retail catalog with global shipping', icon: Layers }
];

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional & Authoritative', desc: 'Expert, trustworthy and serious tone', icon: Briefcase },
  { value: 'casual', label: 'Playful & Humorous', desc: 'Conversational, friendly and witty tone', icon: Smile },
  { value: 'bold', label: 'Bold & Disruptive', desc: 'Urgent, high energy, viral and direct tone', icon: Flame },
  { value: 'educational', label: 'Educational & Informative', desc: 'Value-oriented, insightful and detailed tone', icon: BookOpen },
  { value: 'aesthetic', label: 'Aesthetic & Minimalist', desc: 'Inspirational, luxury, visual-first storytelling', icon: Sparkles }
];

export default function BrandCopilotTab({}) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [strategyGenerating, setStrategyGenerating] = useState(false);
  const [calendarGenerating, setCalendarGenerating] = useState(false);
  const [assetGeneratingDay, setAssetGeneratingDay] = useState(null);
  const [uploadingDay, setUploadingDay] = useState(null);
  const [schedulingDay, setSchedulingDay] = useState(null);
  const [bulkScheduling, setBulkScheduling] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeSlide, setActiveSlide] = useState(1);
  const [useStockVideoMap, setUseStockVideoMap] = useState({}); // { [day]: boolean }
  const [customScheduleTimes, setCustomScheduleTimes] = useState({}); // { [day]: string }
  const [copied, setCopied] = useState(false);

  // Calendar Pagination & Filters
  const [activeWeek, setActiveWeek] = useState('all'); // 'all', '1', '2', '3', '4'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'draft', 'ready', 'scheduled', 'failed'
  const [platformFilter, setPlatformFilter] = useState('all'); // 'all', 'instagram', 'facebook', 'linkedin', 'youtube'
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    timings: 'Mon - Fri, 9:00 AM - 6:00 PM',
    businessModel: 'B2C',
    category: 'E-commerce',
    description: '',
    products: '',
    targetAudience: '',
    tone: 'bold',
    platforms: ['instagram', 'linkedin'],
    contactDetails: {
      phone: '',
      email: '',
      website: '',
      address: ''
    }
  });

  const fetchCampaign = async () => {
    try {
      setLoading(true);
      const res = await marketingCopilotAPI.getCampaign();
      if (res.data?.data) {
        setCampaign(res.data.data);
        const details = res.data.data.businessDetails;
        setFormData({
          ...details,
          contactDetails: {
            phone: details?.contactDetails?.phone || '',
            email: details?.contactDetails?.email || '',
            website: details?.contactDetails?.website || '',
            address: details?.contactDetails?.address || ''
          }
        });
      }
    } catch (err) {
      console.error('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaign();
  }, []);

  const handleFormChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleContactDetailsChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      contactDetails: {
        ...(prev.contactDetails || {}),
        [key]: value
      }
    }));
  };

  const handlePlatformToggle = (platformId) => {
    setFormData(prev => {
      const exists = prev.platforms.includes(platformId);
      const platforms = exists 
        ? prev.platforms.filter(p => p !== platformId)
        : [...prev.platforms, platformId];
      return { ...prev, platforms };
    });
  };

  const saveDetails = async () => {
    if (!formData.name.trim()) return toast.error('Please enter your business name');
    if (!formData.description.trim()) return toast.error('Please describe your business');
    if (formData.platforms.length === 0) return toast.error('Select at least one platform');

    try {
      const res = await marketingCopilotAPI.saveDetails(formData);
      setCampaign(res.data.data);
      return res.data.data;
    } catch {
      toast.error('Failed to save brand profile');
      return null;
    }
  };

  const nextStep = async () => {
    if (activeStep < 3) {
      setActiveStep(prev => prev + 1);
    } else {
      const saved = await saveDetails();
      if (saved) {
        generateStrategy();
      }
    }
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(1, prev - 1));
  };

  const openPreview = (post) => {
    setSelectedPost(post);
    setActiveSlide(1);
    setShowPreviewModal(true);
  };

  const handleCopyCaption = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Caption copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const generateStrategy = async () => {
    setStrategyGenerating(true);
    const tid = toast.loading('AI is crafting your viral growth strategy...');
    try {
      const res = await marketingCopilotAPI.generateStrategy();
      setCampaign(res.data.data);
      toast.success('Viral strategy generated successfully!', { id: tid });
    } catch {
      toast.error('Failed to generate strategy. Please try again.', { id: tid });
    } finally {
      setStrategyGenerating(false);
    }
  };

  const generateCalendar = async () => {
    setCalendarGenerating(true);
    const tid = toast.loading('AI is building your 30-day day-wise posting calendar...');
    try {
      const res = await marketingCopilotAPI.generateCalendar();
      setCampaign(res.data.data);
      toast.success('30-Day calendar generated!', { id: tid });
    } catch {
      toast.error('Failed to generate calendar', { id: tid });
    } finally {
      setCalendarGenerating(false);
    }
  };

  const generateAssets = async (day) => {
    setAssetGeneratingDay(day);
    const useStockVideo = !!useStockVideoMap[day];
    const tid = toast.loading(`Generating media assets for Day ${day}...`);
    try {
      const res = await marketingCopilotAPI.generatePostAssets(day, useStockVideo);
      setCampaign(res.data.data);
      toast.success('Media generated successfully! Post is ready.', { id: tid });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate assets', { id: tid });
    } finally {
      setAssetGeneratingDay(null);
    }
  };

  const handleManualUpload = async (day, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDay(day);
    const tid = toast.loading(`Uploading designer media for Day ${day}...`);
    try {
      const uploadData = new FormData();
      uploadData.append('file', file);

      // 1. Upload to Cloudinary using socialHub API
      const uploadRes = await socialHubAPI.upload(uploadData);
      const mediaUrl = uploadRes.data.data.url;
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

      // 2. Call backend manual approval endpoint
      const res = await marketingCopilotAPI.approveManual(day, mediaUrl, mediaType);
      setCampaign(res.data.data);
      toast.success(`Day ${day} post approved with designer media!`, { id: tid });
      
      if (selectedPost && selectedPost.day === day) {
        setSelectedPost(res.data.data.calendar.find(p => p.day === day));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload designer media', { id: tid });
    } finally {
      setUploadingDay(null);
    }
  };

  const schedulePost = async (day) => {
    setSchedulingDay(day);
    const scheduledTime = customScheduleTimes[day] || undefined;
    const tid = toast.loading(`Scheduling Day ${day} post...`);
    try {
      const res = await marketingCopilotAPI.schedulePost(day, scheduledTime);
      setCampaign(res.data.data);
      toast.success(`Day ${day} post successfully scheduled!`, { id: tid });
      if (selectedPost && selectedPost.day === day) {
        setSelectedPost(res.data.data.calendar.find(p => p.day === day));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule post', { id: tid });
    } finally {
      setSchedulingDay(null);
    }
  };

  const scheduleAllReady = async () => {
    setBulkScheduling(true);
    const tid = toast.loading('Scheduling all ready posts...');
    try {
      const res = await marketingCopilotAPI.scheduleAll();
      setCampaign(res.data.data);
      toast.success(res.data?.message || 'Bulk scheduling complete!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule all posts');
    } finally {
      setBulkScheduling(false);
      toast.dismiss(tid);
    }
  };

  const resetCampaign = async () => {
    if (!window.confirm('Are you sure you want to reset this campaign? All generated posts and strategy will be deleted.')) return;
    try {
      await marketingCopilotAPI.deleteCampaign();
      setCampaign(null);
      setActiveStep(1);
      toast.success('Campaign reset successfully');
    } catch {
      toast.error('Failed to reset campaign');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col justify-center items-center gap-3">
        <Loader2 className="animate-spin text-[#FF6A00]" size={40} />
        <span className={`text-xs font-bold ${'text-slate-500 dark:text-slate-400'}`}>Loading Brand Blueprint...</span>
      </div>
    );
  }

  // --- Render Steps (Form) ---
  if (!campaign || !campaign.strategy?.overallHook) {
    return (
      <div className={`w-full max-w-7xl mx-auto rounded-3xl border p-5 md:p-6 pb-8 md:pb-10 transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
        'bg-white border-slate-200 shadow-xl dark:bg-slate-900/80 dark:border-white/10 dark:shadow-2xl'
      }`}>
        {/* Background glow effects */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#FF6A00]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-orange-500 to-[#FF6A00] flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Sparkles size={28} className="animate-pulse" />
            </div>
            <div>
              <h2 className={`text-2xl font-black tracking-tight ${'text-slate-800 dark:text-white'}`}>AI Brand Copilot</h2>
              <p className={`text-xs mt-0.5 ${'text-slate-500 dark:text-slate-400'}`}>Define your brand details, and AI will build your viral marketing plan & auto-schedule posts.</p>
            </div>
          </div>
          <div className={`text-xs px-3 py-1 rounded-full font-bold border ${'bg-slate-50 border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10 dark:text-slate-400'}`}>
            Wizard Step {activeStep} of 3
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="flex items-center justify-between mb-6 px-4 relative z-10">
          {[1, 2, 3].map(step => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center relative">
                <button
                  onClick={() => step < activeStep && setActiveStep(step)}
                  disabled={step >= activeStep}
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm transition-all duration-500 ${
                    activeStep === step 
                      ? 'bg-gradient-to-r from-orange-500 to-[#FF6A00] text-white shadow-xl shadow-orange-500/30 scale-110' 
                      : activeStep > step 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800/80 dark:text-slate-500 dark:border dark:border-white/5'
                  }`}
                >
                  {activeStep > step ? <Check size={20} /> : step}
                </button>
                <span className={`text-[10px] font-black uppercase tracking-wider mt-3 absolute -bottom-6 whitespace-nowrap ${
                  activeStep === step 
                    ? 'text-[#FF6A00]' 
                    : activeStep > step ? 'text-emerald-500' : 'text-slate-500'
                }`}>
                  {step === 1 ? 'Fundamentals' : step === 2 ? 'Brand Story' : 'Channels & Tone'}
                </span>
              </div>
              {step < 3 && (
                <div className="flex-1 h-[3px] mx-6 rounded-full relative overflow-hidden bg-slate-200 dark:bg-slate-800">
                  <div className={`h-full bg-gradient-to-r from-orange-500 to-[#FF6A00] transition-all duration-700 ${
                    activeStep > step ? 'w-full' : 'w-0'
                  }`} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Contents */}
        <div className="space-y-4 min-h-0 relative z-10 pt-4">
          <AnimatePresence mode="wait">
            {activeStep === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${'text-slate-600 dark:text-slate-300'}`}>Business Name</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={e => handleFormChange('name', e.target.value)} 
                    placeholder="e.g. Mocha Magic Cafe"
                    className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl outline-none border transition-all ${
                      'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00] dark:focus:ring-2 dark:focus:ring-[#FF6A00]/20'
                    }`} 
                  />
                </div>

                <div className="space-y-3">
                  <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${'text-slate-600 dark:text-slate-300'}`}>Business Model</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {MODEL_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const isSelected = formData.businessModel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleFormChange('businessModel', opt.value)}
                          className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all duration-300 ${
                            isSelected 
                              ? 'border-[#FF6A00] bg-[#FF6A00]/5 ring-2 ring-[#FF6A00]/20 shadow-md' 
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/50 hover:border-slate-300 dark:bg-slate-950 dark:border-white/5 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:border-white/15'
                          }`}
                        >
                          <div className={`p-3 rounded-xl ${isSelected ? 'bg-[#FF6A00] text-white' : 'bg-slate-200 text-slate-600 dark:bg-white/5 dark:text-slate-400'}`}>
                            <Icon size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{opt.label}</h4>
                            <p className={`text-xs mt-1 leading-relaxed ${'text-slate-500 dark:text-slate-400'}`}>{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${'text-slate-600 dark:text-slate-300'}`}>Business Category</label>
                    <input 
                      type="text" 
                      value={formData.category} 
                      onChange={e => handleFormChange('category', e.target.value)}
                      placeholder="e.g. Coffee shop, SaaS Software, Yoga Studio"
                      className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl outline-none border transition-all ${
                        'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00] dark:focus:ring-2 dark:focus:ring-[#FF6A00]/20'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${'text-slate-600 dark:text-slate-300'}`}>Hours & Timings</label>
                    <input 
                      type="text" 
                      value={formData.timings} 
                      onChange={e => handleFormChange('timings', e.target.value)}
                      placeholder="e.g. Mon-Fri 9AM-6PM, Sat 10AM-4PM"
                      className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl outline-none border transition-all ${
                        'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00] dark:focus:ring-2 dark:focus:ring-[#FF6A00]/20'
                      }`}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${'text-slate-600 dark:text-slate-300'}`}>Business / Brand Description</label>
                  <textarea 
                    rows={2}
                    value={formData.description} 
                    onChange={e => handleFormChange('description', e.target.value)}
                    placeholder="Describe your business model, brand values, story, and elevator pitch..."
                    className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl outline-none border resize-none transition-all ${
                      'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00] dark:focus:ring-2 dark:focus:ring-[#FF6A00]/20'
                    }`}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${'text-slate-600 dark:text-slate-300'}`}>Key Products / Services</label>
                    <input 
                      type="text" 
                      value={formData.products} 
                      onChange={e => handleFormChange('products', e.target.value)}
                      placeholder="e.g. Espresso, Croissants, Coffee beans subscription"
                      className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl outline-none border transition-all ${
                        'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00] dark:focus:ring-2 dark:focus:ring-[#FF6A00]/20'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-xs font-black uppercase tracking-widest mb-2 ${'text-slate-600 dark:text-slate-300'}`}>Target Audience</label>
                    <input 
                      type="text" 
                      value={formData.targetAudience} 
                      onChange={e => handleFormChange('targetAudience', e.target.value)}
                      placeholder="e.g. Working professionals, students, coffee enthusiasts"
                      className={`w-full px-3 py-2.5 text-sm font-semibold rounded-xl outline-none border transition-all ${
                        'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-[#FF6A00] focus:ring-2 focus:ring-[#FF6A00]/20 dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00] dark:focus:ring-2 dark:focus:ring-[#FF6A00]/20'
                      }`}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/10 space-y-2">
                  <h4 className={`text-xs font-black uppercase tracking-wider ${'text-orange-600 dark:text-[#FF6A00]'} flex items-center gap-2`}>
                    <Zap size={14} className="text-[#FF6A00]" />
                    Contact Info (AI will inject these into CTA captions)
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${'text-slate-500 dark:text-slate-400'}`}>Phone Number</label>
                      <input 
                        type="text" 
                        value={formData.contactDetails?.phone || ''} 
                        onChange={e => handleContactDetailsChange('phone', e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className={`w-full px-3 py-2 text-xs font-semibold rounded-xl outline-none border transition-all ${
                          'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#FF6A00] dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00]'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${'text-slate-500 dark:text-slate-400'}`}>Email Address</label>
                      <input 
                        type="email" 
                        value={formData.contactDetails?.email || ''} 
                        onChange={e => handleContactDetailsChange('email', e.target.value)}
                        placeholder="e.g. contact@business.com"
                        className={`w-full px-3 py-2 text-xs font-semibold rounded-xl outline-none border transition-all ${
                          'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#FF6A00] dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00]'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${'text-slate-500 dark:text-slate-400'}`}>Website URL</label>
                      <input 
                        type="text" 
                        value={formData.contactDetails?.website || ''} 
                        onChange={e => handleContactDetailsChange('website', e.target.value)}
                        placeholder="e.g. https://mybusiness.com"
                        className={`w-full px-3 py-2 text-xs font-semibold rounded-xl outline-none border transition-all ${
                          'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#FF6A00] dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00]'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1 ${'text-slate-500 dark:text-slate-400'}`}>Physical Address</label>
                      <input 
                        type="text" 
                        value={formData.contactDetails?.address || ''} 
                        onChange={e => handleContactDetailsChange('address', e.target.value)}
                        placeholder="e.g. 1st Floor, Tech Hub, Mumbai"
                        className={`w-full px-3 py-2 text-xs font-semibold rounded-xl outline-none border transition-all ${
                          'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#FF6A00] dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00]'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeStep === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest mb-3.5 ${'text-slate-600 dark:text-slate-300'}`}>Brand Tone & Voice</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {TONE_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const isSelected = formData.tone === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleFormChange('tone', opt.value)}
                          className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all duration-300 ${
                            isSelected 
                              ? 'border-[#FF6A00] bg-[#FF6A00]/5 ring-2 ring-[#FF6A00]/20 shadow-md' 
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-950 dark:border-white/5 dark:text-slate-300 dark:hover:bg-slate-800/50 dark:hover:border-white/15'
                          }`}
                        >
                          <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-[#FF6A00] text-white' : 'bg-slate-200 text-slate-500 dark:bg-white/5 dark:text-slate-400'}`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <h5 className="font-bold text-xs">{opt.label}</h5>
                            <p className="text-[10px] text-slate-500 mt-1 leading-normal">{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-black uppercase tracking-widest mb-3.5 ${'text-slate-600 dark:text-slate-300'}`}>Focus Social Channels</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {PLATFORMS_LIST.map(p => {
                      const isSelected = formData.platforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handlePlatformToggle(p.id)}
                          className={`p-5 rounded-2xl border flex flex-col items-center justify-between text-center gap-3 transition-all duration-300 ${
                            isSelected
                              ? `border-[#FF6A00] bg-[#FF6A00]/5 shadow-lg`
                              : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-white/5 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white bg-gradient-to-tr ${p.color} shadow-md`}>
                            {p.icon}
                          </div>
                          <span className="text-xs font-extrabold">{p.label}</span>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected ? 'bg-[#FF6A00] border-[#FF6A00] text-white' : 'border-slate-300 dark:border-slate-800'
                          }`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stepper Actions */}
        <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-200/10 relative z-10">
          <button
            onClick={prevStep}
            disabled={activeStep === 1 || strategyGenerating}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black transition-all ${
              activeStep === 1 
                ? 'opacity-30 cursor-not-allowed' 
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
            }`}
          >
            <ChevronLeft size={16} /> Back
          </button>

          <button
            onClick={nextStep}
            disabled={strategyGenerating}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl text-white text-xs font-black transition-all hover:scale-[1.02] shadow-lg shadow-orange-500/25 bg-[#FF6A00]"
          >
            {strategyGenerating ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Crafting Brand Strategy...
              </>
            ) : activeStep === 3 ? (
              <>
                Build Blueprint Strategy <Sparkles size={16} className="text-yellow-300" />
              </>
            ) : (
              <>
                Next Step <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // --- Render Viral Strategy View ---
  if (!campaign.calendar || campaign.calendar.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className={`rounded-3xl p-8 border relative overflow-hidden backdrop-blur-md transition-all ${
          'bg-white border-slate-200 shadow-xl dark:bg-slate-900 dark:border-white/10 dark:shadow-2xl'
        }`}>
          {/* Background glow effects */}
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-200/10 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FF6A00]/10 flex items-center justify-center text-[#FF6A00]">
                <TrendingUp size={24} />
              </div>
              <div>
                <h1 className={`text-xl font-black ${'text-slate-800 dark:text-white'}`}>Your AI Brand Strategy Blueprint</h1>
                <p className={`text-xs ${'text-slate-500 dark:text-slate-400'}`}>
                  Custom crafted for <strong className="text-[#FF6A00]">{campaign.businessDetails.name}</strong>
                </p>
              </div>
            </div>
            
            <button 
              onClick={resetCampaign} 
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                'border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-red-500 dark:border-white/10 dark:hover:bg-white/5 dark:text-slate-400 dark:hover:text-red-400'
              }`}
            >
              <Trash2 size={14} /> Reset Profile
            </button>
          </div>

          <div className="flex flex-col gap-6 relative z-10">
            <div className="space-y-6">
              {/* Campaign Concept */}
              <div className={`rounded-2xl p-6 border transition-all hover:-translate-y-0.5 duration-300 ${
                'bg-slate-50 border-slate-100 shadow-sm dark:bg-slate-950/50 dark:border-white/5'
              }`}>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#FF6A00] mb-3.5 flex items-center gap-2">
                  <Sparkles size={14} className="text-[#FF6A00]" /> Core Viral Hook & Campaign Theme
                </h3>
                <p className={`text-sm leading-relaxed font-semibold ${'text-slate-700 dark:text-slate-300'}`}>
                  {campaign.strategy.overallHook}
                </p>
              </div>

              {/* Posting Routine */}
              <div className={`rounded-2xl p-6 border transition-all hover:-translate-y-0.5 duration-300 ${
                'bg-slate-50 border-slate-100 shadow-sm dark:bg-slate-950/50 dark:border-white/5'
              }`}>
                <h3 className="text-xs font-black uppercase tracking-wider text-purple-400 mb-3.5 flex items-center gap-2">
                  <Calendar size={14} className="text-purple-400" /> Recommended Posting Schedule
                </h3>
                <p className={`text-sm leading-relaxed ${'text-slate-700 dark:text-slate-300'}`}>
                  {campaign.strategy.postingRoutine}
                </p>
              </div>

              {/* Ad Strategy */}
              <div className={`rounded-2xl p-6 border transition-all hover:-translate-y-0.5 duration-300 ${
                'bg-slate-50 border-slate-100 shadow-sm dark:bg-slate-950/50 dark:border-white/5'
              }`}>
                <h3 className="text-xs font-black uppercase tracking-wider text-sky-400 mb-3.5 flex items-center gap-2">
                  <Sliders size={14} className="text-sky-400" /> Advertising & Keyword Targeting
                </h3>
                <p className={`text-sm leading-relaxed ${'text-slate-700 dark:text-slate-300'}`}>
                  {campaign.strategy.adStrategy}
                </p>
              </div>
            </div>

            {/* Launch Checklist */}
            <div className={`rounded-2xl p-6 border h-fit transition-all hover:-translate-y-0.5 duration-300 ${
              'bg-slate-50/50 border-slate-100 shadow-sm dark:bg-slate-950/50 dark:border-white/5'
            }`}>
              <h3 className={`text-sm font-black mb-5 flex items-center gap-2 ${'text-slate-800 dark:text-white'}`}>
                <Zap size={16} className="text-[#FF6A00]" /> Immediate Action Plan
              </h3>
              <div className="space-y-4">
                {campaign.strategy.actionPlan?.map((step, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-[#FF6A00]/10 flex items-center justify-center text-[#FF6A00] text-xs font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className={`text-xs leading-relaxed font-semibold ${'text-slate-600 dark:text-slate-400'}`}>{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-slate-200/10 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-2.5 text-xs text-slate-400">
              <AlertCircle size={15} className="text-[#FF6A00] shrink-0" />
              <span>Approving will generate your detailed 30-day day-wise posting calendar.</span>
            </div>

            <button
              onClick={generateCalendar}
              disabled={calendarGenerating}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl text-white text-xs font-black transition-all hover:scale-[1.02] shadow-lg shadow-orange-500/25 bg-[#FF6A00]"
            >
              {calendarGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={15} /> Building Calendar Day 1-30...
                </>
              ) : (
                <>
                  Build Day-Wise Calendar <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Render 30-Day Content Calendar View ---
  const totalCount = campaign.calendar.length;
  const scheduledCount = campaign.calendar.filter(p => p.status === 'scheduled').length;
  const readyCount = campaign.calendar.filter(p => p.status === 'ready').length;
  const draftCount = campaign.calendar.filter(p => p.status === 'draft' || !p.status).length;
  const progressPercent = Math.round((scheduledCount / totalCount) * 100);

  // Filter Logic
  const filteredCalendar = campaign.calendar.filter(post => {
    // 1. Week Filter
    if (activeWeek !== 'all') {
      const weekNum = parseInt(activeWeek);
      const day = post.day;
      if (weekNum === 1 && (day < 1 || day > 7)) return false;
      if (weekNum === 2 && (day < 8 || day > 14)) return false;
      if (weekNum === 3 && (day < 15 || day > 21)) return false;
      if (weekNum === 4 && day < 22) return false;
    }
    // 2. Status Filter
    if (statusFilter !== 'all') {
      const currentStatus = post.status || 'draft';
      if (currentStatus !== statusFilter) return false;
    }
    // 3. Platform Filter
    if (platformFilter !== 'all') {
      if (!post.platforms.includes(platformFilter)) return false;
    }
    // 4. Search Filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      const themeMatch = post.theme?.toLowerCase().includes(query);
      const captionMatch = post.caption?.toLowerCase().includes(query);
      if (!themeMatch && !captionMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-4">
      {/* Campaign Summary & Metrics Panel */}
      <div className={`rounded-3xl p-4 md:p-5 border relative overflow-hidden backdrop-blur-md ${
        'bg-white border-slate-200 shadow-xl dark:bg-slate-900/90 dark:border-white/10 dark:shadow-2xl'
      }`}>
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner">
              <Calendar size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <span>30-Day Campaign Desk</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  campaign.status === 'active' 
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                    : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                }`}>
                  {campaign.status}
                </span>
              </h1>
              <p className={`text-xs mt-0.5 ${'text-slate-500 dark:text-slate-400'}`}>
                Plan: <strong className="text-[#FF6A00]">{campaign.businessDetails.name}</strong> • AI Powered Multi-Platform Posting
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {readyCount > 0 && (
              <button
                onClick={scheduleAllReady}
                disabled={bulkScheduling}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-white text-xs font-black bg-gradient-to-r from-orange-500 to-[#FF6A00] hover:scale-[1.02] shadow-md shadow-orange-500/25 transition-all"
              >
                {bulkScheduling ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Scheduling...
                  </>
                ) : (
                  <>
                    Auto-Schedule Ready ({readyCount}) <Send size={14} />
                  </>
                )}
              </button>
            )}

            <button 
              onClick={resetCampaign} 
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black border transition-all ${
                'border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-red-500 dark:border-white/10 dark:hover:bg-white/5 dark:text-slate-400 dark:hover:text-red-400'
              }`}
            >
              <Trash2 size={14} /> Reset Campaign
            </button>
          </div>
        </div>

        {/* Cohesive Stats Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200/10 relative z-10">
          <div className={`p-4 rounded-2xl border ${'bg-slate-50 border-slate-100 dark:bg-slate-950/40 dark:border-white/5'}`}>
            <span className={`text-[10px] uppercase font-black tracking-widest ${'text-slate-400 dark:text-slate-500'}`}>Total Blueprint Posts</span>
            <h4 className="text-xl font-black mt-1">{totalCount} Days</h4>
          </div>
          <div className={`p-4 rounded-2xl border ${'bg-slate-50 border-slate-100 dark:bg-slate-950/40 dark:border-white/5'}`}>
            <span className={`text-[10px] uppercase font-black tracking-widest ${'text-slate-400 dark:text-slate-500'}`}>Ready to Schedule</span>
            <h4 className="text-xl font-black text-emerald-500 mt-1">{readyCount} Posts</h4>
          </div>
          <div className={`p-4 rounded-2xl border ${'bg-slate-50 border-slate-100 dark:bg-slate-950/40 dark:border-white/5'}`}>
            <span className={`text-[10px] uppercase font-black tracking-widest ${'text-slate-400 dark:text-slate-500'}`}>Auto-Scheduled</span>
            <h4 className="text-xl font-black text-purple-500 mt-1">{scheduledCount} Posts</h4>
          </div>
          <div className={`p-4 rounded-2xl border ${'bg-slate-50 border-slate-100 dark:bg-slate-950/40 dark:border-white/5'}`}>
            <span className={`text-[10px] uppercase font-black tracking-widest ${'text-slate-400 dark:text-slate-500'}`}>Draft Queue</span>
            <h4 className="text-xl font-black text-orange-500 mt-1">{draftCount} Pending</h4>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 pt-4 relative z-10">
          <div className="flex justify-between items-center text-xs mb-2">
            <span className={'text-slate-500 dark:text-slate-400'}>Campaign scheduling progress</span>
            <span className="font-extrabold text-[#FF6A00]">{scheduledCount} / {totalCount} Scheduled ({progressPercent}%)</span>
          </div>
          <div className={`h-2.5 rounded-full overflow-hidden ${'bg-slate-100 dark:bg-white/10'}`}>
            <div className="h-full bg-gradient-to-r from-orange-500 to-[#FF6A00] rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Modern Filter Dashboard Controls */}
      <div className={`p-5 rounded-3xl border flex flex-col gap-4 ${
        'bg-white border-slate-200 shadow-md dark:bg-slate-900/50 dark:border-white/5'
      }`}>
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Week Selector Tabs */}
          <div className="flex flex-wrap p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-white/5 self-start">
            {[
              { id: 'all', label: 'All Calendar' },
              { id: '1', label: 'Week 1' },
              { id: '2', label: 'Week 2' },
              { id: '3', label: 'Week 3' },
              { id: '4', label: 'Week 4' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveWeek(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${
                  activeWeek === tab.id
                    ? 'bg-white text-slate-800 shadow-sm dark:bg-slate-800 dark:text-white dark:shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search post captions or themes..."
              className={`w-full pl-10 pr-4 py-2 text-xs font-semibold rounded-xl outline-none border transition-all ${
                'bg-slate-50 border-slate-200 text-slate-800 focus:border-[#FF6A00] dark:bg-slate-950 dark:border-white/5 dark:text-white dark:focus:border-[#FF6A00]'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap gap-4 pt-3 border-t border-slate-200/10 items-center">
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className={`p-2 rounded-lg text-xs font-semibold border outline-none ${
                'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-white/5 dark:text-white'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft Queue</option>
              <option value="ready">Ready (Assets Generated)</option>
              <option value="scheduled">Scheduled Auto-Post</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-slate-400">Platform:</span>
            <select
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className={`p-2 rounded-lg text-xs font-semibold border outline-none ${
                'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-white/5 dark:text-white'
              }`}
            >
              <option value="all">All Channels</option>
              <option value="instagram">Instagram</option>
              <option value="facebook">Facebook</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
            </select>
          </div>

          {(statusFilter !== 'all' || platformFilter !== 'all' || searchQuery || activeWeek !== 'all') && (
            <button
              onClick={() => {
                setStatusFilter('all');
                setPlatformFilter('all');
                setSearchQuery('');
                setActiveWeek('all');
              }}
              className="text-xs text-[#FF6A00] font-bold hover:underline ml-auto"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Grid of days */}
      {filteredCalendar.length === 0 ? (
        <div className={`text-center py-16 rounded-3xl border ${'bg-slate-50 border-slate-200 dark:bg-slate-900/30 dark:border-white/5'}`}>
          <AlertCircle className="mx-auto mb-3 text-slate-400" size={32} />
          <h4 className={`font-black text-sm ${'text-slate-800 dark:text-white'}`}>No matching campaign posts found</h4>
          <p className="text-xs text-slate-500 mt-1">Try resetting your filter parameters or checking another week.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCalendar.map((post) => {
            const hasMedia = !!post.mediaUrl;
            const isScheduled = post.status === 'scheduled';
            const isGenerating = post.status === 'generating';
            const isReady = post.status === 'ready';

            return (
              <div 
                key={post.day}
                className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group ${
                  isScheduled 
                    ? 'bg-purple-50/40 border-purple-200 shadow-sm dark:bg-purple-950/10 dark:border-purple-500/30 dark:shadow-md dark:shadow-purple-500/5' 
                    : isReady 
                    ? 'bg-emerald-50/40 border-emerald-200 shadow-sm dark:bg-emerald-950/10 dark:border-emerald-500/30 dark:shadow-md dark:shadow-emerald-500/5'
                    : 'bg-white border-slate-100 shadow-sm hover:border-[#FF6A00]/40 hover:shadow-md dark:bg-slate-900/60 dark:border-white/5 dark:hover:border-[#FF6A00]/40'
                }`}
              >
                {/* Badge top-right */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                    isScheduled 
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                      : isReady 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : isGenerating
                      ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'
                      : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/5'
                  }`}>
                    {post.status || 'draft'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6A00]">Day {post.day}</span>
                  <h3 className={`font-black text-sm mt-1.5 mb-2 line-clamp-1 ${'text-slate-800 dark:text-white'}`}>{post.theme}</h3>
                  
                  {/* Media Icon & Post Type Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-1.5 rounded-lg border ${'bg-slate-100 border-slate-200 dark:bg-white/5 dark:border-white/5'}`}>
                      {post.type === 'reel' || post.type === 'video' ? (
                        <Video size={13} className="text-pink-500" />
                      ) : (
                        <ImageIcon size={13} className="text-blue-500" />
                      )}
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${'text-slate-500 dark:text-slate-400'}`}>{post.type}</span>
                    {post.slides && post.slides.length > 0 && (
                      <span className="text-[9px] font-black text-orange-500 bg-orange-500/10 px-1.5 py-0.5 rounded-md">
                        {post.slides.length} Slides
                      </span>
                    )}
                    
                    {/* Platforms Icon list */}
                    <div className="flex gap-1 items-center ml-auto">
                      {post.platforms.map(p => (
                        <div 
                          key={p} 
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold uppercase ${
                            p === 'instagram' ? 'bg-pink-500 text-white' :
                            p === 'facebook' ? 'bg-blue-600 text-white' :
                            p === 'linkedin' ? 'bg-[#0077b5] text-white' :
                            p === 'youtube' ? 'bg-red-600 text-white' : 'bg-sky-500 text-white'
                          }`}
                          title={p}
                        >
                          {p[0]}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Caption Snippet */}
                  <p className={`text-xs leading-relaxed line-clamp-3 mb-4 font-medium italic ${'text-slate-600 dark:text-slate-400'}`}>
                    "{post.caption}"
                  </p>

                  {/* Media Preview Box / Sleek Placeholder */}
                  <div className="rounded-xl overflow-hidden aspect-video relative group mb-4 bg-black/20 dark:bg-black/40 border border-slate-200/50 dark:border-slate-700/30">
                    {hasMedia ? (
                      post.mediaType === 'video' ? (
                        <video src={post.mediaUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={post.mediaUrl} className="w-full h-full object-cover" alt="Post creative" />
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col justify-center items-center gap-2 p-4 text-center">
                        <ImageIcon size={24} className="text-slate-400/50" />
                        <span className="text-[10px] font-semibold text-slate-500">Assets ready to generate</span>
                      </div>
                    )}
                    <button 
                      onClick={() => openPreview(post)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-xs font-black transition-opacity duration-300 gap-1"
                    >
                      <Eye size={16} /> 
                      <span>Open Workspace</span>
                    </button>
                  </div>

                  {/* Error Banner */}
                  {post.error && (
                    <div className="mb-4 p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-[10px] flex items-start gap-1.5">
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <span>Error: {post.error}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3.5 pt-3 border-t border-slate-200/5 mt-auto">
                  {/* Generation settings for videos */}
                  {(post.type === 'reel' || post.type === 'video') && !hasMedia && !isGenerating && (
                    <div className="flex items-center justify-between text-[10px] px-1 font-bold">
                      <span className={'text-slate-500 dark:text-slate-400'}>Generate with Stock Video:</span>
                      <button 
                        onClick={() => setUseStockVideoMap(prev => ({ ...prev, [post.day]: !prev[post.day] }))}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          useStockVideoMap[post.day] ? 'bg-[#FF6A00]' : 'bg-slate-300 dark:bg-white/10'
                        }`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          useStockVideoMap[post.day] ? 'translate-x-4' : 'translate-x-0'
                        }`} />
                      </button>
                    </div>
                  )}

                  {/* Scheduler time input */}
                  {isReady && (
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-slate-400 shrink-0" />
                      <input 
                        type="datetime-local"
                        defaultValue={new Date(post.scheduledAt).toISOString().slice(0, 16)}
                        onChange={e => setCustomScheduleTimes(prev => ({ ...prev, [post.day]: e.target.value }))}
                        className={`w-full p-2 text-[10px] rounded-lg outline-none border font-bold ${
                          'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-white/5 dark:text-white'
                        }`}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!hasMedia ? (
                      <div className="flex gap-2 w-full">
                        <button
                          onClick={() => generateAssets(post.day)}
                          disabled={isGenerating || uploadingDay === post.day}
                          className={`flex-1 h-9 rounded-xl flex items-center justify-center gap-1.5 text-[11px] font-black text-white transition-all bg-gradient-to-r from-orange-500 to-[#FF6A00] hover:scale-[1.02] shadow-sm shadow-orange-500/15 disabled:opacity-40 disabled:scale-100`}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="animate-spin" size={12} /> Generating...
                            </>
                          ) : (
                            <>
                              AI Media <Sparkles size={12} className="text-yellow-300 animate-pulse" />
                            </>
                          )}
                        </button>
                        
                        <label className={`flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer hover:scale-[1.02] ${
                          'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
                        } ${uploadingDay === post.day ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          {uploadingDay === post.day ? (
                            <>
                              <Loader2 className="animate-spin" size={12} /> Uploading...
                            </>
                          ) : (
                            <>
                              Designer <Upload size={12} />
                            </>
                          )}
                          <input 
                            type="file" 
                            accept="image/*,video/*" 
                            onChange={(e) => handleManualUpload(post.day, e)} 
                            className="hidden" 
                            disabled={isGenerating || uploadingDay === post.day}
                          />
                        </label>
                      </div>
                    ) : !isScheduled ? (
                      <>
                        <button
                          onClick={() => openPreview(post)}
                          className={`px-3 h-9 rounded-xl border flex items-center justify-center transition-all ${
                            'border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-white/10 dark:hover:bg-white/5 dark:text-slate-300'
                          }`}
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => schedulePost(post.day)}
                          disabled={schedulingDay === post.day}
                          className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl text-white text-xs font-black bg-purple-600 hover:bg-purple-700 transition-all hover:scale-[1.02] shadow-md shadow-purple-500/10 disabled:opacity-40"
                        >
                          {schedulingDay === post.day ? (
                            <Loader2 className="animate-spin" size={12} />
                          ) : (
                            <>
                              Schedule Auto-Post <Clock size={12} />
                            </>
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 py-2 px-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-400 text-center text-[10px] font-black flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={12} /> Scheduled: {new Date(post.scheduledAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Preview Modal Overlay */}
      {showPreviewModal && selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className={`w-full max-w-4xl rounded-3xl overflow-hidden border flex flex-col md:flex-row relative transition-all duration-300 ${
            'bg-white border-slate-200 shadow-2xl dark:bg-slate-900 dark:border-white/10 dark:shadow-2xl'
          }`} style={{ height: 'min(90vh, 700px)' }}>
            
            {/* Close Button */}
            <button 
              onClick={() => {
                setShowPreviewModal(false);
                setSelectedPost(null);
              }}
              className={`absolute top-4 right-4 z-20 p-2 rounded-full border transition-all ${
                'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 dark:bg-black/50 dark:border-white/10 dark:text-white dark:hover:bg-white/10'
              }`}
            >
              <X size={16} />
            </button>

            {/* Left Hand Visual Preview */}
            <div className="flex-1 bg-black flex items-center justify-center relative p-6 border-b md:border-b-0 md:border-r border-slate-200/10">
              {selectedPost.mediaUrl ? (
                selectedPost.mediaType === 'video' ? (
                  <video src={selectedPost.mediaUrl} className="w-full h-full max-h-[480px] object-contain rounded-2xl shadow-lg" controls autoPlay loop muted />
                ) : (
                  <img src={selectedPost.mediaUrl} className="w-full h-full max-h-[480px] object-contain rounded-2xl shadow-lg" alt="Preview creative" />
                )
              ) : (
                <div className="text-center text-slate-500">
                  <ImageIcon size={48} className="mx-auto mb-3 opacity-30 text-slate-400" />
                  <h5 className="text-sm font-black text-slate-400">AI Graphics Desk</h5>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">No media assets generated yet. Use the action panel on the right to start generating details.</p>
                </div>
              )}
            </div>

            {/* Right Hand Meta Details & Actions */}
            <div className={`w-full md:w-[400px] p-6 flex flex-col justify-between overflow-y-auto ${
              'text-slate-800 bg-white dark:text-white dark:bg-slate-900'
            }`}>
              <div className="space-y-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6A00]">Day {selectedPost.day} • {selectedPost.type}</span>
                  <h2 className="text-xl font-black mt-1 leading-tight tracking-tight">{selectedPost.theme}</h2>
                </div>

                {/* Caption Panel with Copy Action */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Social Caption</span>
                    <button
                      onClick={() => handleCopyCaption(selectedPost.caption)}
                      className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
                        copied 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
                      }`}
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className={`p-4 rounded-2xl border text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-48 overflow-y-auto ${
                    'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-white/5 dark:text-slate-300'
                  }`}>
                    {selectedPost.caption}
                  </div>
                </div>

                {selectedPost.type === 'reel' && selectedPost.videoScript && (
                  <div>
                    <h4 className="text-xs font-black text-slate-400 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                      <Play size={12} className="text-pink-500" /> Reel Script/Visuals
                    </h4>
                    <p className={`text-xs leading-relaxed p-4 rounded-xl border italic font-medium ${
                      'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950/60 dark:border-white/5 dark:text-slate-400'
                    }`}>
                      {selectedPost.videoScript}
                    </p>
                  </div>
                )}

                {selectedPost.imagePrompt && (
                  <div>
                    <h4 className="text-xs font-black text-slate-400 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider">
                      <ImageIcon size={12} className="text-blue-500" /> Creative AI Image Prompt
                    </h4>
                    <p className={`text-xs leading-relaxed p-4 rounded-xl border italic font-medium ${
                      'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950/60 dark:border-white/5 dark:text-slate-400'
                    }`}>
                      {selectedPost.imagePrompt}
                    </p>
                  </div>
                )}

                {/* Slides layout for Carousel posts */}
                {selectedPost.slides && selectedPost.slides.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-slate-200/10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Layers size={14} className="text-[#FF6A00]" />
                        Graphic Slides ({selectedPost.slides.length})
                      </h4>
                      <div className="flex gap-1.5 items-center">
                        <button 
                          onClick={() => setActiveSlide(prev => Math.max(1, prev - 1))}
                          disabled={activeSlide === 1}
                          className={`p-1.5 rounded-md border text-[10px] transition-all ${
                            activeSlide === 1 
                              ? 'opacity-30 cursor-not-allowed' 
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-white/10 dark:hover:bg-white/5 dark:text-slate-300'
                          }`}
                        >
                          <ChevronLeft size={11} />
                        </button>
                        <span className="text-[10px] font-black font-mono text-[#FF6A00]">
                          {activeSlide} / {selectedPost.slides.length}
                        </span>
                        <button 
                          onClick={() => setActiveSlide(prev => Math.min(selectedPost.slides.length, prev + 1))}
                          disabled={activeSlide === selectedPost.slides.length}
                          className={`p-1.5 rounded-md border text-[10px] transition-all ${
                            activeSlide === selectedPost.slides.length 
                              ? 'opacity-30 cursor-not-allowed' 
                              : 'border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-white/10 dark:hover:bg-white/5 dark:text-slate-300'
                          }`}
                        >
                          <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>

                    <div className={`p-4 rounded-2xl border space-y-3 transition-all ${
                      'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-white/5'
                    }`}>
                      {selectedPost.slides.map((slide) => {
                        if (slide.slideNumber !== activeSlide) return null;
                        return (
                          <div key={slide.slideNumber} className="space-y-2.5 text-left">
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-wider text-[#FF6A00] bg-orange-500/10 px-2 py-0.5 rounded">Slide {slide.slideNumber} Heading</span>
                              <p className={`text-xs font-extrabold mt-1.5 ${'text-slate-800 dark:text-white'}`}>{slide.heading || 'No text content'}</p>
                            </div>
                            
                            {slide.body && (
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Body Subtext</span>
                                <p className={`text-[11px] leading-relaxed font-medium mt-1 ${'text-slate-600 dark:text-slate-300'}`}>{slide.body}</p>
                              </div>
                            )}

                            {slide.imagePrompt && (
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">Background Prompt</span>
                                <p className={`text-[10px] italic font-medium leading-relaxed mt-1 ${'text-slate-500 dark:text-slate-400'}`}>"{slide.imagePrompt}"</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action desk footer */}
              <div className="pt-6 border-t border-slate-200/10 space-y-3.5 mt-6">
                {selectedPost.status === 'scheduled' ? (
                  <div className="py-3 px-4 rounded-xl border border-purple-500/20 bg-purple-500/5 text-purple-400 text-xs font-black text-center flex items-center justify-center gap-2">
                    <CheckCircle2 size={14} /> Scheduled: {new Date(selectedPost.scheduledAt).toLocaleString()}
                  </div>
                ) : selectedPost.mediaUrl ? (
                  <button
                    onClick={() => schedulePost(selectedPost.day)}
                    disabled={schedulingDay === selectedPost.day}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-white text-xs font-black bg-purple-600 hover:bg-purple-700 transition-all hover:scale-[1.02] shadow-lg shadow-purple-500/20 disabled:opacity-40"
                  >
                    {schedulingDay === selectedPost.day ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        Schedule Auto-Post Now <Clock size={14} />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      generateAssets(selectedPost.day);
                    }}
                    className="w-full h-11 flex items-center justify-center gap-2 rounded-xl text-white text-xs font-black bg-gradient-to-r from-orange-500 to-[#FF6A00] transition-all hover:scale-[1.02] shadow-md shadow-orange-500/25"
                  >
                    Generate AI Assets <Sparkles size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
