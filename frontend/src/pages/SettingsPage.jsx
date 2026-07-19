import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Lock, Bell, Shield, Loader2, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuthStore, useOrganizationStore } from '../store';
import toast from 'react-hot-toast';
import TeamMembers from '../components/settings/TeamMembers';

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  const { currentOrganization } = useOrganizationStore();
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');
  const [activeTab, setActiveTab] = useState('profile');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [loadingLimits, setLoadingLimits] = useState(false);
  const [agentLimitVal, setAgentLimitVal] = useState(0);
  const [postingLimitVal, setPostingLimitVal] = useState(0);

  React.useEffect(() => {
    if (user?.subscription) {
      setAgentLimitVal(user.subscription.agentCreditLimit || 0);
      setPostingLimitVal(user.subscription.postingCreditLimit || 0);
    }
  }, [user]);

  React.useEffect(() => {
    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const profileForm = useForm({ defaultValues: { name: user?.name || '' } });
  const passwordForm = useForm();

  const onUpdateProfile = async (data) => {
    try {
      await authAPI.updateProfile(data);
      await fetchUser();
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to update'); }
  };

  const onChangePassword = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    try {
      await authAPI.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      passwordForm.reset();
      toast.success('Password changed!');
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
    { id: 'profile', label: 'Profile', icon: User, minRole: 'viewer' },
    { id: 'security', label: 'Security', icon: Lock, minRole: 'viewer' },
    { id: 'team', label: 'Team', icon: Shield, minRole: 'admin' },
    { id: 'limits', label: 'Spend Limits', icon: Shield, minRole: 'owner' },
    { id: 'danger', label: 'Danger Zone', icon: Trash2, minRole: 'owner' },
  ];

  const tabs = ALL_TABS.filter(t => (roleLevels[currentRole] || 1) >= (roleLevels[t.minRole] || 1));

  const onRequestDeletion = async () => {
    setIsDeleting(true);
    try {
      await authAPI.requestDeletion();
      toast.success('Deletion request received. You will be logged out.');
      setTimeout(() => {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to request deletion');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className={`text-2xl font-extrabold ${'text-gray-900 dark:text-slate-100'}`}>Settings</h1>
        <p className={`text-sm mt-1 ${'text-gray-500 dark:text-slate-400'}`}>Manage your account preferences</p>
      </div>

      <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${'bg-white border-gray-200 shadow-sm dark:bg-slate-900 dark:border-white/10'}`}>
        {/* Tabs */}
        <div className={`flex border-b ${'border-gray-100 dark:border-white/10'}`}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2
                ${activeTab === id ? 'text-[#FF6A00] border-[#FF6A00]' : 'text-gray-500 border-transparent hover:text-gray-700 dark:text-slate-400 dark:border-transparent dark:hover:text-slate-200'}`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-5">
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all ${'bg-whatsapp/20 text-whatsapp dark:bg-whatsapp/15 dark:text-whatsapp'}`}>
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className={`font-semibold ${'text-gray-900 dark:text-slate-100'}`}>{user?.name}</p>
                    <p className={`text-sm ${'text-gray-500 dark:text-slate-400'}`}>{user?.email}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block capitalize font-medium transition-all duration-300
                      ${user?.isEmailVerified ? ('bg-green-100 text-green-700 dark:bg-emerald-500/10 dark:text-emerald-400') : ('bg-yellow-100 text-yellow-700 dark:bg-amber-500/10 dark:text-amber-400')}`}>
                      {user?.isEmailVerified ? '✓ Email verified' : '⚠ Email not verified'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${'text-gray-700 dark:text-slate-300'}`}>Full Name</label>
                <input
                  {...profileForm.register('name', { required: true, minLength: 2 })}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30 focus:border-[#FF6A00] text-sm transition-all ${
                    'bg-white border-gray-200 text-gray-900 placeholder:text-slate-400 dark:bg-slate-950 dark:border-white/10 dark:text-slate-100 dark:placeholder:text-slate-500'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${'text-gray-700 dark:text-slate-300'}`}>Email Address</label>
                <input value={user?.email} disabled className={`w-full px-4 py-3 border rounded-xl text-sm cursor-not-allowed transition-all ${'bg-gray-50 border-gray-100 text-gray-400 dark:bg-slate-950/40 dark:border-white/10 dark:text-slate-500'}`} />
                <p className={`text-xs mt-1 ${'text-gray-400 dark:text-slate-500'}`}>Email cannot be changed.</p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${'text-gray-700 dark:text-slate-300'}`}>Subscription Plan</label>
                <div className={`px-4 py-3 border rounded-xl flex items-center justify-between transition-all ${'bg-gray-50 border-gray-100 dark:bg-slate-950/40 dark:border-white/10'}`}>
                  <span className={`text-sm font-medium capitalize ${'text-gray-800 dark:text-slate-300'}`}>{user?.subscription?.plan || 'free'}</span>
                  <a href="/app/billing" className="text-xs text-[#FF6A00] font-medium hover:underline">Manage →</a>
                </div>
              </div>

              <button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
                className="flex items-center gap-2 bg-[#FF6A00] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:brightness-95 disabled:opacity-60 transition-colors shadow-lg shadow-orange-500/10"
              >
                {profileForm.formState.isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : 'Save Changes'}
              </button>
            </form>
          )}

          {activeTab === 'team' && (
            <div className="slide-in">
              <TeamMembers />
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-5">
              <h3 className={`font-semibold ${'text-gray-800 dark:text-slate-200'}`}>Change Password</h3>

              {[
                { name: 'currentPassword', label: 'Current Password' },
                { name: 'newPassword', label: 'New Password' },
                { name: 'confirmPassword', label: 'Confirm New Password' },
              ].map((f) => (
                <div key={f.name}>
                  <label className={`block text-sm font-medium mb-1.5 ${'text-gray-700 dark:text-slate-300'}`}>{f.label}</label>
                  <input
                    {...passwordForm.register(f.name, { required: true, minLength: f.name !== 'currentPassword' ? 8 : 1 })}
                    type="password"
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF6A00]/30 focus:border-[#FF6A00] text-sm transition-all ${
                      'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-950 dark:border-white/10 dark:text-slate-100 dark:placeholder:text-slate-600'
                    }`}
                  />
                </div>
              ))}

              <div className={`rounded-xl p-4 transition-all ${'bg-blue-50 border border-blue-100 dark:bg-blue-500/10 dark:border dark:border-blue-500/20'}`}>
                <p className={`text-xs font-semibold mb-2 ${'text-blue-700 dark:text-blue-400'}`}>Password requirements:</p>
                <ul className={`text-xs space-y-1 ${'text-blue-600 dark:text-blue-300/80'}`}>
                  <li>• Minimum 8 characters</li>
                  <li>• Use a mix of letters, numbers and symbols for best security</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 transition-colors ${
                  'bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                }`}
              >
                {passwordForm.formState.isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Updating...</> : 'Update Password'}
              </button>
            </form>
          )}

          {activeTab === 'limits' && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              const maxAllowed = Math.max(0, user?.subscription?.credits || 0);
              const agentLimit = Math.max(0, parseInt(agentLimitVal) || 0);
              const postingLimit = Math.max(0, parseInt(postingLimitVal) || 0);

              if (agentLimit > 0 && agentLimit > maxAllowed) {
                toast.error(`AI Agent Spend Limit (${agentLimit}) cannot exceed your remaining available credits of ${maxAllowed}.`);
                return;
              }
              if (postingLimit > 0 && postingLimit > maxAllowed) {
                toast.error(`Social Posting Spend Limit (${postingLimit}) cannot exceed your remaining available credits of ${maxAllowed}.`);
                return;
              }
              if (agentLimit > 0 && postingLimit > 0 && (agentLimit + postingLimit) > maxAllowed) {
                toast.error(`Combined Spend Limits (${agentLimit + postingLimit}) cannot exceed your remaining available credits of ${maxAllowed}.`);
                return;
              }

              setLoadingLimits(true);
              try {
                await authAPI.updateProfile({ 
                  agentCreditLimit: agentLimit,
                  postingCreditLimit: postingLimit 
                });
                await fetchUser();
                toast.success('Spend limits updated!');
              } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to update spend limits');
              } finally {
                setLoadingLimits(false);
              }
            }} className="space-y-6 animate-fade-in">
              <div>
                <h3 className={`text-lg font-bold ${'text-gray-900 dark:text-slate-200'}`}>Custom Spend Limits</h3>
                <p className={`text-xs mt-1 ${'text-gray-500 dark:text-slate-400'}`}>
                  Control how your allocated credits are consumed. Setting a limit to 0 means unlimited credits can be spent by that channel.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Agent Limit */}
                <div className={`p-5 border rounded-2xl bg-gradient-to-br transition-all duration-300 ${'from-whatsapp/5 to-emerald-500/5 border-whatsapp/10 dark:from-whatsapp/10 dark:to-emerald-500/10 dark:border-whatsapp/20'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-whatsapp/10 text-whatsapp rounded-xl">
                      <User size={18} />
                    </div>
                    <span className={`font-bold text-sm ${'text-gray-800 dark:text-slate-200'}`}>AI Agent Responses</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={`block text-[10px] font-bold uppercase ${'text-gray-500 dark:text-slate-400'}`}>
                      Spend Ceiling (Max: {user?.subscription?.credits || 0})
                    </label>
                    {parseInt(agentLimitVal) > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          setAgentLimitVal(0);
                          setLoadingLimits(true);
                          try {
                            await authAPI.updateProfile({ agentCreditLimit: 0 });
                            await fetchUser();
                            toast.success('AI Agent spend limit removed!');
                          } catch (err) {
                            toast.error(err.response?.data?.message || 'Failed to remove limit');
                          } finally {
                            setLoadingLimits(false);
                          }
                        }}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    name="agentCreditLimit"
                    value={agentLimitVal}
                    onChange={(e) => setAgentLimitVal(e.target.value)}
                    min={0}
                    max={user?.subscription?.credits || 0}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-whatsapp/30 focus:border-whatsapp text-sm transition-all ${
                      'bg-white border-gray-200 text-gray-900 dark:bg-slate-950 dark:border-white/10 dark:text-slate-100'
                    }`}
                  />
                  <div className={`flex justify-between text-xs mt-2 ${'text-gray-500 dark:text-slate-400'}`}>
                    <span>Used this cycle:</span>
                    <span className={`font-semibold ${'text-gray-800 dark:text-slate-200'}`}>
                      {(user?.usage?.agentCreditsUsedThisMonth ?? 0).toLocaleString()} Credits
                    </span>
                  </div>
                </div>

                {/* Posting Limit */}
                <div className={`p-5 border rounded-2xl bg-gradient-to-br transition-all duration-300 ${'from-amber-500/5 to-orange-500/5 border-amber-500/10 dark:from-amber-500/10 dark:to-orange-500/10 dark:border-amber-500/20'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                      <Shield size={18} />
                    </div>
                    <span className={`font-bold text-sm ${'text-gray-800 dark:text-slate-200'}`}>Social Publishing</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={`block text-[10px] font-bold uppercase ${'text-gray-500 dark:text-slate-400'}`}>
                      Spend Ceiling (Max: {user?.subscription?.credits || 0})
                    </label>
                    {parseInt(postingLimitVal) > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          setPostingLimitVal(0);
                          setLoadingLimits(true);
                          try {
                            await authAPI.updateProfile({ postingCreditLimit: 0 });
                            await fetchUser();
                            toast.success('Social Posting spend limit removed!');
                          } catch (err) {
                            toast.error(err.response?.data?.message || 'Failed to remove limit');
                          } finally {
                            setLoadingLimits(false);
                          }
                        }}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    name="postingCreditLimit"
                    value={postingLimitVal}
                    onChange={(e) => setPostingLimitVal(e.target.value)}
                    min={0}
                    max={user?.subscription?.credits || 0}
                    className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm transition-all ${
                      'bg-white border-gray-200 text-gray-900 dark:bg-slate-950 dark:border-white/10 dark:text-slate-100'
                    }`}
                  />
                  <div className={`flex justify-between text-xs mt-2 ${'text-gray-500 dark:text-slate-400'}`}>
                    <span>Used this cycle:</span>
                    <span className={`font-semibold ${'text-gray-800 dark:text-slate-200'}`}>
                      {(user?.usage?.postingCreditsUsedThisMonth ?? 0).toLocaleString()} Credits
                    </span>
                  </div>
                </div>
              </div>

              <div className={`p-4 border rounded-2xl transition-all ${'bg-gray-50 border-gray-100 dark:bg-slate-950/50 dark:border-white/5'}`}>
                <h4 className={`text-xs font-bold uppercase mb-1 ${'text-gray-800 dark:text-slate-300'}`}>How limits work:</h4>
                <ul className={`text-xs space-y-1 leading-relaxed ${'text-gray-500 dark:text-slate-400'}`}>
                  <li>• Limits are evaluated per automated event and posting workflow in real-time.</li>
                  <li>• If a limit is hit, AI responses or social publications will pause until the limit is raised or the billing cycle resets.</li>
                  <li>• You can adjust these settings at any time with immediate effect.</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={loadingLimits}
                className="flex items-center gap-2 bg-[#FF6A00] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:brightness-95 disabled:opacity-60 transition-colors shadow-md shadow-orange-500/10"
              >
                {loadingLimits ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : 'Save Limit Settings'}
              </button>
            </form>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-6 animate-fade-in">
              <div className={`border rounded-2xl p-6 transition-all duration-300 ${'bg-red-50 border-red-100 dark:bg-rose-950/20 dark:border-rose-500/20'}`}>
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-100 rounded-xl text-red-600">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${'text-gray-900 dark:text-rose-400'}`}>Delete Account</h3>
                    <p className={`text-sm mt-1 ${'text-gray-600 dark:text-rose-300/80'}`}>
                      Once you request account deletion, your account will be disabled immediately. 
                      You will have 30 days to contact support if you change your mind. 
                      After 30 days, all your data will be permanently removed.
                    </p>
                  </div>
                </div>

                <DeletionFlow onComplete={fetchUser}  />
              </div>

              <div className={`p-6 border rounded-2xl transition-all ${'border-gray-100 bg-white dark:border-white/10 dark:bg-slate-900/20'}`}>
                <h4 className={`font-semibold mb-2 ${'text-gray-900 dark:text-slate-200'}`}>What happens next?</h4>
                <ul className={`text-sm space-y-3 ${'text-gray-500 dark:text-slate-400'}`}>
                  <li className="flex items-start gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mt-0.5 ${'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400'}`}>1</span>
                    Your account is logged out and disabled immediately.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mt-0.5 ${'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400'}`}>2</span>
                    All automated agents and social publishing tasks are paused.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] mt-0.5 ${'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-400'}`}>3</span>
                    After 30 days, your profile, connected accounts, and chat history are permanently deleted.
                  </li>
                </ul>
              </div>
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
      toast.success('3 verification codes sent to your email');
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
      setTimeout(() => {
        window.location.reload(); // Will trigger redirect in App.jsx
      }, 2000);
    } catch (err) {}
    setLoading(false);
  };

  if (step === 1) {
    return (
      <div className={`mt-8 space-y-5 p-5 rounded-2xl border shadow-sm transition-all duration-300 ${'bg-white border-red-50 dark:bg-slate-950 dark:border-rose-500/20 dark:shadow-none'}`}>
        <h4 className={`font-bold ${'text-gray-900 dark:text-slate-200'}`}>Step 1: Why are you leaving?</h4>
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-bold uppercase mb-2 ${'text-gray-500 dark:text-slate-400'}`}>Purpose of Deletion</label>
            <select 
              value={survey.reason}
              onChange={(e) => setSurvey({...survey, reason: e.target.value})}
              className={`w-full px-4 py-3 border rounded-xl outline-none text-sm transition-all ${
                'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-red-100 dark:bg-slate-900 dark:border-white/10 dark:text-slate-100 dark:focus:ring-2 dark:focus:ring-red-500/20'
              }`}
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
            <label className={`block text-xs font-bold uppercase mb-2 ${'text-gray-500 dark:text-slate-400'}`}>Anything else we should know?</label>
            <textarea 
              value={survey.feedback}
              onChange={(e) => setSurvey({...survey, feedback: e.target.value})}
              placeholder="Your feedback helps us improve..."
              className={`w-full px-4 py-3 border rounded-xl outline-none text-sm h-24 transition-all ${
                'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-red-100 dark:bg-slate-900 dark:border-white/10 dark:text-slate-100 dark:focus:ring-2 dark:focus:ring-red-500/20'
              }`}
            />
          </div>
        </div>
        <button
          onClick={startVerification}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${
            'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
          }`}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Proceed to Verification'}
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className={`mt-8 space-y-5 p-5 rounded-2xl border shadow-sm animate-fade-in transition-all duration-300 ${'bg-white border-red-50 dark:bg-slate-950 dark:border-rose-500/20 dark:shadow-none'}`}>
        <div className="flex items-center justify-between">
          <h4 className={`font-bold ${'text-gray-900 dark:text-slate-200'}`}>Step 2: Enter Verification Codes</h4>
          <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600">Back</button>
        </div>
        <p className={`text-xs ${'text-gray-500 dark:text-slate-400'}`}>We've sent 3 unique codes to your email. Please enter them in order.</p>
        
        <div className="grid grid-cols-3 gap-3">
          {['otp1', 'otp2', 'otp3'].map((key, i) => (
            <div key={key}>
              <label className={`block text-[10px] font-bold uppercase mb-1 ${'text-gray-500 dark:text-slate-400'}`}>Code {i+1}</label>
              <input 
                type="text"
                maxLength={4}
                value={otps[key]}
                onChange={(e) => setOtps({...otps, [key]: e.target.value})}
                placeholder="0000"
                className={`w-full px-3 py-3 border rounded-xl text-center font-mono font-bold text-lg focus:border-red-500 outline-none transition-all ${
                  'bg-white border-gray-200 text-gray-900 dark:bg-slate-900 dark:border-white/10 dark:text-slate-100'
                }`}
              />
            </div>
          ))}
        </div>

        <div className={`p-4 rounded-xl transition-all ${'bg-red-50 text-red-600 dark:bg-rose-950/20 dark:text-rose-300'}`}>
          <p className="text-[11px] leading-relaxed">
            <b>Warning:</b> Confirming this will immediately disable your account. 
            This action is recorded and irreversible after 30 days.
          </p>
        </div>

        <button
          onClick={confirmDeletion}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
          Permanently Delete My Account
        </button>
      </div>
    );
  }
}
