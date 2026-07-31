import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { User, Lock, Shield, Loader2, Trash2, AlertTriangle, ChevronRight, ChevronLeft, CheckCircle2, Zap, CreditCard, Save } from 'lucide-react';
import { authAPI, organizationAPI } from '../services/api';
import { useAuthStore, useOrganizationStore } from '../store';
import toast from 'react-hot-toast';
import TeamMembers from '../components/settings/TeamMembers';

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  
  // URL sync state
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [isMobileDetailView, setIsMobileDetailView] = useState(!!searchParams.get('tab'));
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [agentLimitVal, setAgentLimitVal] = useState(0);
  const [postingLimitVal, setPostingLimitVal] = useState(0);

  useEffect(() => {
    if (user?.subscription) {
      setAgentLimitVal(user.subscription.agentCreditLimit || 0);
      setPostingLimitVal(user.subscription.postingCreditLimit || 0);
    }
  }, [user]);

  useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    setIsMobileDetailView(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToMenu = () => {
    setIsMobileDetailView(false);
    setSearchParams({});
  };

  const profileForm = useForm({ defaultValues: { name: user?.name || '' } });
  const passwordForm = useForm();

  const onUpdateProfile = async (data) => {
    try {
      await authAPI.updateProfile(data);
      await fetchUser();
      toast.success('Profile updated successfully!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
  };

  const onChangePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    try {
      await authAPI.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      passwordForm.reset();
      toast.success('Password changed securely!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password'); }
  };

  // Determine user role in current organization
  const roleLevels = { owner: 4, admin: 3, editor: 2, viewer: 1 };
  let currentRole = "viewer";
  if (currentOrganization) {
    if (currentOrganization.owner === user?._id) {
      currentRole = "owner";
    } else {
      const member = currentOrganization.members?.find(m => m.user === user?._id || m.user?._id === user?._id);
      if (member) currentRole = member.role;
    }
  }

  const ALL_TABS = [
    { id: 'profile', label: 'My Profile', icon: User, minRole: 'viewer', desc: 'Manage your personal details' },
    { id: 'security', label: 'Security', icon: Lock, minRole: 'viewer', desc: 'Update passwords and security' },
    { id: 'team', label: 'Team Members', icon: Shield, minRole: 'admin', desc: 'Manage access and roles' },
    { id: 'limits', label: 'Spend Limits', icon: Zap, minRole: 'owner', desc: 'Control AI & Automation usage' },
    { id: 'danger', label: 'Danger Zone', icon: Trash2, minRole: 'owner', desc: 'Account deletion' },
  ];

  const tabs = ALL_TABS.filter(t => (roleLevels[currentRole] || 1) >= (roleLevels[t.minRole] || 1));

  // Premium glassmorphism base classes
  const glassCard = `rounded-[2rem] border backdrop-blur-xl shadow-sm transition-all duration-300 ${isDark ? 'bg-slate-900/40 border-white/10' : 'bg-white/80 border-slate-200 shadow-slate-200/50'}`;
  const glassInput = `w-full px-5 py-3.5 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/40 ${isDark ? 'bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-[#FF6A00]' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#FF6A00]'}`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Page Header */}
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 ${isMobileDetailView ? 'hidden lg:flex' : 'flex'}`}>
        <div>
          <h1 className={`text-3xl md:text-4xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Account Settings
          </h1>
          <p className={`text-sm mt-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your personal preferences, security, and workspace limits.
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Navigation */}
        <div className={`w-full lg:w-72 shrink-0 ${isMobileDetailView ? 'hidden lg:block' : 'block'}`}>
          <div className="sticky top-6 flex flex-col gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border ${
                    active
                      ? isDark ? 'bg-[#FF6A00]/10 border-[#FF6A00]/20 text-white shadow-lg shadow-[#FF6A00]/5' : 'bg-[#FF6A00]/10 border-[#FF6A00]/20 text-[#FF6A00] shadow-lg shadow-[#FF6A00]/10'
                      : isDark ? 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl transition-colors ${active ? (isDark ? 'bg-[#FF6A00]/20 text-[#FF6A00]' : 'bg-[#FF6A00] text-white') : (isDark ? 'bg-white/5 group-hover:bg-white/10' : 'bg-slate-100 group-hover:bg-slate-200')}`}>
                      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-bold ${active ? 'text-inherit' : ''}`}>{tab.label}</p>
                      <p className={`text-[10px] hidden lg:block ${active ? (isDark ? 'text-[#FF6A00]/70' : 'text-[#FF6A00]/80') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>{tab.desc}</p>
                    </div>
                  </div>
                  {active && <ChevronRight size={16} className={isDark ? 'text-[#FF6A00]' : 'text-[#FF6A00]'} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className={`flex-1 min-w-0 ${!isMobileDetailView ? 'hidden lg:block' : 'block'}`}>
          
          <div className="lg:hidden mb-4 slide-in">
            <button onClick={handleBackToMenu} className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              <ChevronLeft size={16} /> Back to Settings Menu
            </button>
          </div>

          {activeTab === 'profile' && (
            <div className="space-y-6 slide-in">
              {/* Profile Card */}
              <div className={glassCard + ' overflow-hidden'}>
                <div className={`p-8 border-b ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50/50'}`}>
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FF6A00] to-[#FF4500] p-1 shadow-xl shadow-orange-500/20 shrink-0">
                        <div className={`w-full h-full rounded-full flex items-center justify-center text-4xl font-black text-white ${isDark ? 'bg-slate-900' : 'bg-slate-800'}`}>
                          {user?.name?.[0]?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h2 className={`text-2xl font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{user?.name}</h2>
                      <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{user?.email}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${user?.isEmailVerified ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                          {user?.isEmailVerified ? <><CheckCircle2 size={12} /> Verified</> : <><AlertTriangle size={12} /> Unverified</>}
                        </span>
                        <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider bg-blue-500/10 text-blue-500`}>
                          <CreditCard size={12} /> {user?.subscription?.plan || 'Free Plan'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-6 max-w-xl">
                    <div className="space-y-5">
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Full Name</label>
                        <input
                          {...profileForm.register('name', { required: true, minLength: 2 })}
                          className={glassInput}
                          placeholder="Enter your full name"
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Email Address</label>
                        <input value={user?.email || ''} disabled className={`${glassInput} opacity-60 cursor-not-allowed`} />
                        <p className={`text-[11px] mt-2 font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Email addresses cannot be changed directly for security reasons.</p>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={profileForm.formState.isSubmitting}
                        className="flex items-center gap-2 bg-gradient-to-r from-[#FF6A00] to-[#FF4500] text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-60"
                      >
                        {profileForm.formState.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="slide-in">
              <TeamMembers />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6 slide-in">
              <div className={glassCard + ' p-8'}>
                <div className="mb-8">
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Update Password</h2>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ensure your account is using a long, random password to stay secure.</p>
                </div>

                <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-6 max-w-xl">
                  <div className="space-y-5">
                    {[
                      { name: 'currentPassword', label: 'Current Password' },
                      { name: 'newPassword', label: 'New Password' },
                      { name: 'confirmPassword', label: 'Confirm New Password' },
                    ].map((f) => (
                      <div key={f.name}>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{f.label}</label>
                        <input
                          {...passwordForm.register(f.name, { required: true, minLength: f.name !== 'currentPassword' ? 8 : 1 })}
                          type="password"
                          placeholder="••••••••"
                          className={glassInput}
                        />
                      </div>
                    ))}
                  </div>

                  <div className={`p-5 rounded-2xl flex items-start gap-3 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'}`}>
                    <Shield className={isDark ? 'text-blue-400' : 'text-blue-500'} size={20} />
                    <div>
                      <p className={`text-sm font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>Password requirements</p>
                      <ul className={`text-xs mt-2 space-y-1 font-medium ${isDark ? 'text-blue-300/80' : 'text-blue-600'}`}>
                        <li>• Minimum 8 characters long</li>
                        <li>• Use a mix of letters, numbers and symbols</li>
                        <li>• Never reuse passwords across sites</li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={passwordForm.formState.isSubmitting}
                      className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60 ${isDark ? 'bg-white text-slate-900 hover:bg-slate-200 shadow-lg shadow-white/10' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-black/10'}`}
                    >
                      {passwordForm.formState.isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Updating...</> : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'limits' && (
            <div className="space-y-6 slide-in">
              <div className={glassCard + ' p-8'}>
                <div className="mb-8">
                  <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Usage & Spend Limits</h2>
                  <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Control how your allocated {user?.subscription?.credits || 0} monthly credits are consumed across different channels.</p>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const maxAllowed = Math.max(0, user?.subscription?.credits || 0);
                  const agentLimit = Math.max(0, parseInt(agentLimitVal) || 0);
                  const postingLimit = Math.max(0, parseInt(postingLimitVal) || 0);

                  if (agentLimit > 0 && agentLimit > maxAllowed) return toast.error(`AI Limit cannot exceed ${maxAllowed}`);
                  if (postingLimit > 0 && postingLimit > maxAllowed) return toast.error(`Posting Limit cannot exceed ${maxAllowed}`);
                  if (agentLimit > 0 && postingLimit > 0 && (agentLimit + postingLimit) > maxAllowed) return toast.error(`Combined Limits cannot exceed ${maxAllowed}`);

                  setLoadingLimits(true);
                  try {
                    await authAPI.updateProfile({ agentCreditLimit: agentLimit, postingCreditLimit: postingLimit });
                    await fetchUser();
                    toast.success('Spend limits updated successfully!');
                  } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
                  setLoadingLimits(false);
                }} className="space-y-6">
                  
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* AI Agent Spend */}
                    <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all duration-500 ${isDark ? 'bg-gradient-to-br from-whatsapp/10 to-transparent border-whatsapp/20' : 'bg-gradient-to-br from-whatsapp/5 to-white border-whatsapp/20 shadow-sm'}`}>
                      <div className="absolute top-0 right-0 p-6 opacity-20">
                        <User size={64} className="text-whatsapp" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-whatsapp/20 text-whatsapp rounded-2xl shadow-inner">
                            <Zap size={20} fill="currentColor" />
                          </div>
                          <span className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>AI Agents</span>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-end mb-2">
                              <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Limit (0 = Unlimited)</label>
                              {parseInt(agentLimitVal) > 0 && (
                                <button type="button" onClick={() => setAgentLimitVal(0)} className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors">✕ Clear Limit</button>
                              )}
                            </div>
                            <input
                              type="number"
                              value={agentLimitVal}
                              onChange={(e) => setAgentLimitVal(e.target.value)}
                              min={0}
                              max={user?.subscription?.credits || 0}
                              className={`w-full px-5 py-3.5 rounded-2xl border text-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-whatsapp/40 ${isDark ? 'bg-slate-950/60 border-whatsapp/20 text-white focus:border-whatsapp' : 'bg-white border-whatsapp/30 text-slate-900 focus:border-whatsapp'}`}
                            />
                          </div>
                          
                          <div className={`p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                            <div className="flex justify-between text-xs mb-2">
                              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Used this cycle:</span>
                              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{(user?.usage?.agentCreditsUsedThisMonth ?? 0).toLocaleString()} Credits</span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                              <div className="h-full bg-whatsapp rounded-full" style={{ width: `${Math.min(100, ((user?.usage?.agentCreditsUsedThisMonth ?? 0) / Math.max(1, agentLimitVal || user?.subscription?.credits || 1)) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Social Posting Spend */}
                    <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all duration-500 ${isDark ? 'bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20' : 'bg-gradient-to-br from-amber-500/5 to-white border-amber-500/20 shadow-sm'}`}>
                      <div className="absolute top-0 right-0 p-6 opacity-20">
                        <Shield size={64} className="text-amber-500" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 bg-amber-500/20 text-amber-500 rounded-2xl shadow-inner">
                            <Shield size={20} fill="currentColor" />
                          </div>
                          <span className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Social Posting</span>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between items-end mb-2">
                              <label className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Limit (0 = Unlimited)</label>
                              {parseInt(postingLimitVal) > 0 && (
                                <button type="button" onClick={() => setPostingLimitVal(0)} className="text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors">✕ Clear Limit</button>
                              )}
                            </div>
                            <input
                              type="number"
                              value={postingLimitVal}
                              onChange={(e) => setPostingLimitVal(e.target.value)}
                              min={0}
                              max={user?.subscription?.credits || 0}
                              className={`w-full px-5 py-3.5 rounded-2xl border text-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${isDark ? 'bg-slate-950/60 border-amber-500/20 text-white focus:border-amber-500' : 'bg-white border-amber-500/30 text-slate-900 focus:border-amber-500'}`}
                            />
                          </div>
                          
                          <div className={`p-4 rounded-2xl ${isDark ? 'bg-black/20' : 'bg-slate-50'}`}>
                            <div className="flex justify-between text-xs mb-2">
                              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Used this cycle:</span>
                              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{(user?.usage?.postingCreditsUsedThisMonth ?? 0).toLocaleString()} Credits</span>
                            </div>
                            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, ((user?.usage?.postingCreditsUsedThisMonth ?? 0) / Math.max(1, postingLimitVal || user?.subscription?.credits || 1)) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl flex gap-3 ${isDark ? 'bg-slate-950/50 border border-white/5' : 'bg-slate-50 border border-slate-100'}`}>
                    <Shield className={isDark ? 'text-slate-500' : 'text-slate-400'} size={20} />
                    <div>
                      <p className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>How do limits work?</p>
                      <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Limits evaluate per automated event in real-time. If a limit is hit, AI responses or publications will pause until raised or your billing cycle resets.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={loadingLimits}
                      className="flex items-center gap-2 bg-gradient-to-r from-[#FF6A00] to-[#FF4500] text-white px-8 py-3.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-60"
                    >
                      {loadingLimits ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save Limit Settings
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="slide-in space-y-8">
              {/* Delete Account Card */}
              <div className={`rounded-[2rem] border overflow-hidden shadow-2xl transition-all duration-300 ${isDark ? 'bg-rose-950/20 border-rose-500/20 shadow-rose-900/10' : 'bg-white border-red-100 shadow-red-100'}`}>
                <div className="p-8">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                    <div className="p-4 bg-red-500/10 rounded-2xl text-red-500 border border-red-500/20 shrink-0">
                      <AlertTriangle size={32} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-red-500">Delete Account</h2>
                      <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-rose-200/70' : 'text-slate-600'}`}>
                        This action cannot be undone. Requesting account deletion will immediately disable your account, pause all automations, and permanently erase your data after 30 days.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <DeletionFlow onComplete={fetchUser} isDark={isDark} />
                  </div>
                </div>
              </div>

              {/* Delete Organization Card */}
              {currentOrganization && currentRole === 'owner' && (
                <div className={`rounded-[2rem] border overflow-hidden shadow-2xl transition-all duration-300 ${isDark ? 'bg-rose-950/20 border-rose-500/20 shadow-rose-900/10' : 'bg-white border-red-100 shadow-red-100'}`}>
                  <div className="p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                      <div className="p-4 bg-red-500/10 rounded-2xl text-red-500 border border-red-500/20 shrink-0">
                        <AlertTriangle size={32} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-red-500">Delete Workspace</h2>
                        <p className={`text-sm mt-2 leading-relaxed ${isDark ? 'text-rose-200/70' : 'text-slate-600'}`}>
                          Permanently delete the active workspace <strong>"{currentOrganization.name}"</strong> and all its associated data (agents, contacts, conversations, social settings, integrations). <strong>This action is irreversible.</strong>
                        </p>
                      </div>
                    </div>

                    <div className="mt-8">
                      <OrgDeletionFlow isDark={isDark} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeletionFlow({ onComplete, isDark }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [survey, setSurvey] = useState({ reason: '', feedback: '' });
  const [otps, setOtps] = useState({ otp1: '', otp2: '', otp3: '' });

  const startVerification = async () => {
    if (!survey.reason) return toast.error('Please select a reason');
    setLoading(true);
    try {
      await authAPI.sendDeletionOTP();
      toast.success('Verification codes sent to your email');
      setStep(2);
    } catch (err) {}
    setLoading(false);
  };

  const confirmDeletion = async () => {
    if (!otps.otp1 || !otps.otp2 || !otps.otp3) return toast.error('Please enter all 3 codes');
    setLoading(true);
    try {
      await authAPI.confirmDeletion({ ...survey, ...otps });
      toast.success('Account scheduled for deletion. You will be redirected.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {}
    setLoading(false);
  };

  if (step === 1) {
    return (
      <div className={`space-y-6 p-6 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
        <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Step 1: Why are you leaving?</h4>
        <div className="space-y-5">
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Purpose of Deletion</label>
            <select 
              value={survey.reason}
              onChange={(e) => setSurvey({...survey, reason: e.target.value})}
              className={`w-full px-5 py-3.5 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500/40 ${isDark ? 'bg-slate-950/60 border-white/10 text-white focus:border-red-500' : 'bg-white border-slate-200 text-slate-900 focus:border-red-500'}`}
            >
              <option value="">Select a reason</option>
              <option value="no_longer_needed">I no longer need the service</option>
              <option value="too_complex">The platform is too complex</option>
              <option value="missing_features">Missing features I need</option>
              <option value="privacy_concerns">Privacy/Security concerns</option>
              <option value="pricing">Pricing is too high</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Additional Feedback</label>
            <textarea 
              value={survey.feedback}
              onChange={(e) => setSurvey({...survey, feedback: e.target.value})}
              placeholder="Your feedback helps us improve..."
              className={`w-full px-5 py-3.5 rounded-2xl border text-sm h-32 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/40 ${isDark ? 'bg-slate-950/60 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-red-500'}`}
            />
          </div>
        </div>
        <button
          onClick={startVerification}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${isDark ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Proceed to Verification'}
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className={`space-y-6 p-6 rounded-3xl border animate-fade-in ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center justify-between">
          <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Step 2: Enter Verification Codes</h4>
          <button onClick={() => setStep(1)} className={`text-xs font-bold ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>← Back</button>
        </div>
        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>We've sent 3 unique codes to your email. Please enter them below.</p>
        
        <div className="grid grid-cols-3 gap-4">
          {['otp1', 'otp2', 'otp3'].map((key, i) => (
            <div key={key}>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Code {i+1}</label>
              <input 
                type="text"
                maxLength={4}
                value={otps[key]}
                onChange={(e) => setOtps({...otps, [key]: e.target.value})}
                placeholder="0000"
                className={`w-full px-2 py-4 border rounded-2xl text-center font-mono font-black text-xl transition-all focus:outline-none focus:ring-2 focus:ring-red-500/40 ${isDark ? 'bg-slate-950/80 border-white/10 text-white focus:border-red-500' : 'bg-white border-slate-200 text-slate-900 focus:border-red-500'}`}
              />
            </div>
          ))}
        </div>

        <button
          onClick={confirmDeletion}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-4 rounded-xl text-sm font-bold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Permanently Delete My Account
        </button>
      </div>
    );
  }
}

function OrgDeletionFlow({ isDark }) {
  const { currentOrganization, clearOrganizations } = useOrganizationStore();
  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const handleDelete = async () => {
    if (confirmName !== currentOrganization.name) {
      return toast.error("Workspace name does not match confirmation");
    }

    setLoading(true);
    const toastId = toast.loading('Deleting workspace...');
    try {
      const res = await organizationAPI.delete(currentOrganization._id);
      if (res.data.status === 'success') {
        toast.success('Workspace deleted successfully!', { id: toastId });
        
        // Clear cached organizations in state so DashboardLayout auto-selects or redirects
        clearOrganizations();
        
        // Refresh page to trigger DashboardLayout auto-create / select flow
        setTimeout(() => {
          window.location.href = '/app/dashboard';
        }, 1500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete workspace', { id: toastId });
    } finally {
      setLoading(false);
      setShowWarningModal(false);
    }
  };

  const glassInput = `w-full px-5 py-3.5 rounded-2xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-red-500/40 ${isDark ? 'bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500' : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-red-500'}`;

  return (
    <div className={`space-y-6 p-6 rounded-3xl border ${isDark ? 'bg-slate-900/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
      <h4 className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Workspace Deletion Confirmation</h4>
      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        Please type the workspace name <strong className="font-mono text-red-500">"{currentOrganization?.name}"</strong> to confirm your intent.
      </p>

      <input
        type="text"
        placeholder="Type workspace name..."
        value={confirmName}
        onChange={(e) => setConfirmName(e.target.value)}
        className={glassInput}
      />

      <button
        disabled={confirmName !== currentOrganization?.name || loading}
        onClick={() => setShowWarningModal(true)}
        className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-4 rounded-xl text-sm font-bold hover:bg-red-700 active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        Request Workspace Deletion
      </button>

      {/* Warning Confirmation Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className={`max-w-md w-full p-8 rounded-[2rem] border shadow-2xl ${isDark ? 'bg-slate-900 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
            <div className="flex items-center gap-4 text-red-500 mb-4">
              <AlertTriangle size={32} />
              <h3 className="text-xl font-black">Final Warning</h3>
            </div>
            
            <p className={`text-sm leading-relaxed mb-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              You are about to delete <strong className="text-red-500">"{currentOrganization.name}"</strong>. This will delete all connected WhatsApp/Instagram keys, CRM databases, campaigns, agent brains, and team permissions. 
              <br /><br />
              This action <strong>CANNOT</strong> be undone. Are you absolutely sure?
            </p>

            <div className="flex gap-4">
              <button
                disabled={loading}
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white text-sm font-bold py-3.5 rounded-xl hover:bg-red-700 active:scale-95 transition-all"
              >
                Yes, Delete Workspace
              </button>
              <button
                disabled={loading}
                onClick={() => setShowWarningModal(false)}
                className={`flex-1 text-sm font-bold py-3.5 rounded-xl ${isDark ? 'bg-white/10 text-slate-200 hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
