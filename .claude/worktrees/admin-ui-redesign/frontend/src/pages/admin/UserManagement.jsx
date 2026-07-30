import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  ExternalLink,
  Shield,
  ShieldAlert,
  UserX,
  UserCheck,
  CreditCard,
  Smartphone,
  Send,
  Instagram,
  X,
  Clock,
  Calendar,
  Zap,
  Activity,
  History,
  Bot,
  ShieldCheck,
  Check,
  ArrowLeft,
  Mail,
  Lock,
  Unlock,
  Facebook,
  Linkedin,
  Youtube,
  AlertTriangle,
  Globe,
  User
} from "lucide-react";
import { adminAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const UserManagement = () => {
  const [searchParams] = useSearchParams();
  const userIdFromQuery = searchParams.get("userId");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleToAssign, setRoleToAssign] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);

  // A-to-Z User Dashboard states
  const [activeTab, setActiveTab] = useState("overview");
  const [refundingPaymentId, setRefundingPaymentId] = useState(null);
  const [updatingPaymentId, setUpdatingPaymentId] = useState(null);
  const [newPaymentStatus, setNewPaymentStatus] = useState("");

  // Dynamic Subscription Edit States
  const [plansList, setPlansList] = useState([]);
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [customCredits, setCustomCredits] = useState("");
  const [customMessageLimit, setCustomMessageLimit] = useState("");
  const [customAgentLimit, setCustomAgentLimit] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchPlansList();
    if (userIdFromQuery) {
      fetchUserDetails(userIdFromQuery);
    }
  }, [userIdFromQuery]);

  const fetchPlansList = async () => {
    try {
      const response = await adminAPI.getPlans();
      setPlansList(response.data.data.plans);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      setUsers(response.data.data.users);
    } catch (error) {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (id) => {
    setDetailsLoading(true);
    setSelectedUserId(id);
    try {
      const response = await adminAPI.getUserDetails(id);
      const data = response.data.data;
      setUserDetails(data);
      setSelectedPlanCode(data.user.subscription?.plan || "free");
      setCustomCredits(data.user.subscription?.credits ?? 0);
      setCustomMessageLimit(data.user.subscription?.messageLimit ?? 1000);
      setCustomAgentLimit(data.user.subscription?.agentLimit ?? 3);
    } catch (error) {
      toast.error("Failed to fetch user details");
      setSelectedUserId(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleUpdateSubscription = async () => {
    try {
      const payload = {
        plan: selectedPlanCode,
        credits: parseInt(customCredits) || 0,
        messageLimit: parseInt(customMessageLimit) || 1000,
        agentLimit: parseInt(customAgentLimit) || 3
      };
      
      const response = await adminAPI.updateUser(userDetails.user._id, payload);
      toast.success("User subscription updated successfully");
      
      // Update local state
      setUsers(users.map(u => u._id === userDetails.user._id ? { ...u, subscription: response.data.data.user.subscription } : u));
      setUserDetails({ ...userDetails, user: response.data.data.user });
    } catch (e) {
      toast.error("Failed to update subscription");
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await adminAPI.updateUser(userId, {
        isActive: !currentStatus
      });
      
      setUsers(users.map(u => u._id === userId ? { ...u, isActive: !currentStatus } : u));
      if (userDetails && userDetails.user._id === userId) {
        setUserDetails({ ...userDetails, user: { ...userDetails.user, isActive: !currentStatus } });
      }
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      toast.error("Failed to update user status");
    }
  };

  const handleRequestRoleChange = async () => {
    if (!roleToAssign) {
      toast.error("Please select a role");
      return;
    }
    
    setIsRequestingOtp(true);
    try {
      await adminAPI.requestRoleChange(userDetails.user._id, roleToAssign);
      toast.success("OTP sent to your administrator email");
      setShowRoleModal(true);
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleConfirmRoleChange = async () => {
    if (otpValue.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await adminAPI.confirmRoleChange(userDetails.user._id, otpValue);
      toast.success(response.data.message);
      
      // Update local state
      setUsers(users.map(u => u._id === userDetails.user._id ? { ...u, role: response.data.data.user.role } : u));
      setUserDetails({ ...userDetails, user: response.data.data.user });
      
      // Reset modal state
      setShowRoleModal(false);
      setOtpValue("");
    } catch (error) {
      // Error handled by interceptor
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleRefundPayment = async (paymentId) => {
    if (!window.confirm("Are you sure you want to simulate a refund for this payment? This will revert the user's plan to Free, deduct credits, log a debit, and send an email notification.")) return;
    setRefundingPaymentId(paymentId);
    try {
      await adminAPI.refundPayment(paymentId);
      toast.success("Payment refunded successfully!");
      fetchUserDetails(selectedUserId);
    } catch (e) {
      toast.error("Failed to refund payment");
    } finally {
      setRefundingPaymentId(null);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId) => {
    if (!newPaymentStatus) return;
    setUpdatingPaymentId(paymentId);
    try {
      await adminAPI.updatePaymentStatus(paymentId, newPaymentStatus);
      toast.success("Payment status updated successfully!");
      setUpdatingPaymentId(null);
      setNewPaymentStatus("");
      fetchUserDetails(selectedUserId);
    } catch (e) {
      toast.error("Failed to update payment status");
      setUpdatingPaymentId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {selectedUserId ? (
        // ==========================================
        // 🌟 A TO Z USER DEEP-DIVE DASHBOARD VIEW
        // ==========================================
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 text-gray-300"
        >
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedUserId(null)}
                className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all border border-white/10"
                title="Back to User List"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-extrabold text-white text-2xl uppercase shadow-lg shadow-emerald-500/20">
                  {userDetails?.user?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-black text-white">{userDetails?.user?.name || 'Loading user...'}</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      userDetails?.user?.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                    }`}>
                      {userDetails?.user?.role}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      userDetails?.user?.isActive 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {userDetails?.user?.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-gray-400">
                    <Mail className="w-4 h-4 text-emerald-500" />
                    <span>{userDetails?.user?.email}</span>
                    {userDetails?.user?.isEmailVerified ? (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold uppercase">Verified</span>
                    ) : (
                      <span className="text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded-md font-bold uppercase">Unverified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => toggleUserStatus(userDetails?.user?._id, userDetails?.user?.isActive)}
                className={`px-5 py-3 rounded-2xl font-semibold text-sm transition-all border shadow-lg ${
                  userDetails?.user?.isActive
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 hover:shadow-rose-950/20'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 hover:shadow-emerald-950/20'
                }`}
              >
                {userDetails?.user?.isActive ? 'Suspend Profile' : 'Activate Profile'}
              </button>
            </div>
          </div>

          {/* Dynamic Tabs Bar */}
          <div className="flex items-center gap-2 overflow-x-auto p-1 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm shadow-inner custom-scrollbar">
            {[
              { id: 'overview', label: 'Overview', icon: User },
              { id: 'limits', label: 'Plan & Overrides', icon: CreditCard },
              { id: 'usage', label: 'Usage Metrics', icon: Activity },
              { id: 'channels', label: 'Connected Channels', icon: Smartphone },
              { id: 'agents', label: 'AI Agents Deployed', icon: Bot },
              { id: 'billing', label: 'Payments History', icon: History },
              { id: 'credits', label: 'Credits Log', icon: Zap },
              { id: 'security', label: 'Security & Audits', icon: AlertTriangle }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all relative ${
                    isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-500' : 'text-gray-400'}`} />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Loader when details are fetching */}
          {detailsLoading ? (
            <div className="p-20 text-center bg-white/5 border border-white/10 rounded-3xl backdrop-blur-sm">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading complete user details...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-sm shadow-xl"
              >
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Basic Info Card */}
                    <div className="md:col-span-2 space-y-6">
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
                        <h3 className="text-base font-bold text-white mb-6 border-b border-white/5 pb-3">User Profile Identity</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">User Identifier (ObjectID)</span>
                            <span className="text-sm font-mono text-emerald-400 select-all">{userDetails?.user?._id}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Full Registered Name</span>
                            <span className="text-sm text-white font-semibold">{userDetails?.user?.name}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">System Account Role</span>
                            <span className="text-sm capitalize font-semibold text-white">{userDetails?.user?.role}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Account Creation Date</span>
                            <span className="text-sm text-white font-semibold flex items-center gap-1.5">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {userDetails?.user?.createdAt ? new Date(userDetails.user.createdAt).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Last Logged In Time</span>
                            <span className="text-sm text-white font-semibold flex items-center gap-1.5">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {userDetails?.user?.lastLogin ? new Date(userDetails.user.lastLogin).toLocaleString() : 'Never logged in'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Lock Duration Status</span>
                            {userDetails?.user?.lockUntil && new Date(userDetails.user.lockUntil) > new Date() ? (
                              <span className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg font-semibold w-fit flex items-center gap-1">
                                <Lock className="w-3.5 h-3.5" /> Locked until {new Date(userDetails.user.lockUntil).toLocaleTimeString()}
                              </span>
                            ) : (
                              <span className="text-xs text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-semibold w-fit flex items-center gap-1">
                                <Unlock className="w-3.5 h-3.5" /> Normal unlocked state
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Deletion Request Status (If Pending) */}
                      {userDetails?.user?.isDeletionPending && (
                        <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-3xl flex items-start gap-4">
                          <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl"><AlertTriangle className="w-6 h-6" /></div>
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">Account Deletion Requested!</h4>
                            <p className="text-xs text-gray-400">This user requested to delete their account on {new Date(userDetails.user.deletionRequestedAt).toLocaleDateString()}.</p>
                            {userDetails.user.deletionReason && (
                              <p className="text-xs text-rose-300 italic">"Reason: {userDetails.user.deletionReason}"</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Role Overrides Control Column */}
                    <div className="space-y-6">
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4 shadow-md">
                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                          <Shield className="w-4 h-4 text-emerald-500" /> Administrative Role
                        </h3>
                        <p className="text-xs text-gray-400">Modify the permissions role level for this user. This triggers a safety OTP sent to the administrator email address.</p>
                        
                        <div className="space-y-3 pt-2">
                          <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Target Account Role</label>
                          <select 
                            value={roleToAssign}
                            onChange={(e) => setRoleToAssign(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                          >
                            <option value="" disabled className="bg-[#0f172a]">Select a role level</option>
                            <option value="user" className="bg-[#0f172a]">Standard User</option>
                            <option value="admin" className="bg-[#0f172a]">System Admin</option>
                          </select>

                          <button
                            onClick={handleRequestRoleChange}
                            disabled={isRequestingOtp || !roleToAssign || roleToAssign === userDetails?.user?.role}
                            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isRequestingOtp ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : <ShieldAlert className="w-4 h-4" />}
                            Update Access Role
                          </button>
                        </div>
                      </div>

                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-3">
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Beta Tester Eligibility</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          userDetails?.user?.isBetaTester 
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                            : 'bg-white/5 text-gray-400 border border-white/10'
                        }`}>
                          <Zap className="w-3.5 h-3.5" />
                          {userDetails?.user?.isBetaTester ? 'Enabled for Beta features' : 'Disabled (Stable releases only)'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PLANS & OVERRIDES TAB */}
                {activeTab === 'limits' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Plan Information Card */}
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-emerald-500" /> Active Subscription details
                      </h3>
                      <div className="space-y-4 pt-2">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Current Tier</span>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase border ${
                            userDetails?.user?.subscription?.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-500 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]' :
                            userDetails?.user?.subscription?.plan === 'pro' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.15)]' :
                            userDetails?.user?.subscription?.plan === 'starter' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]' :
                            'bg-gray-500/10 text-gray-400 border-white/10'
                          }`}>
                            {userDetails?.user?.subscription?.plan?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Billing Status</span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            userDetails?.user?.subscription?.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}>
                            {userDetails?.user?.subscription?.status || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Razorpay Identifiers</span>
                          <p className="text-xs text-gray-400 font-mono select-all">Sub: {userDetails?.user?.subscription?.razorpaySubscriptionId || 'N/A'}</p>
                          <p className="text-xs text-gray-400 font-mono select-all mt-1">Cust: {userDetails?.user?.subscription?.razorpayCustomerId || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Current Period Ends</span>
                          <span className="text-xs text-white font-medium flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-500" />
                            {userDetails?.user?.subscription?.currentPeriodEnd ? new Date(userDetails.user.subscription.currentPeriodEnd).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Adjustments Controls */}
                    <div className="md:col-span-2 p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-6">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-500" /> Administrative Limits Customizer
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Plan Template</label>
                          <select 
                            value={selectedPlanCode}
                            onChange={(e) => {
                              const newPlan = e.target.value;
                              setSelectedPlanCode(newPlan);
                              const found = plansList.find(p => p.code === newPlan);
                              if (found) {
                                setCustomCredits(found.credits);
                                setCustomMessageLimit(found.messageLimit);
                                setCustomAgentLimit(found.agentLimit);
                              }
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                          >
                            <option value="free" className="bg-[#0f172a]">Free Plan</option>
                            {plansList.map(p => (
                              <option key={p.code} value={p.code} className="bg-[#0f172a]">
                                {p.name} (₹{p.price})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Credits Balance</label>
                          <input
                            type="number"
                            value={customCredits}
                            onChange={(e) => setCustomCredits(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Max Deployed AI Agents</label>
                          <input
                            type="number"
                            value={customAgentLimit}
                            onChange={(e) => setCustomAgentLimit(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">Monthly Message Limit</label>
                          <input
                            type="number"
                            value={customMessageLimit}
                            onChange={(e) => setCustomMessageLimit(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 flex justify-end">
                        <button 
                          onClick={handleUpdateSubscription}
                          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          Apply Account Overrides
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. USAGE TAB */}
                {activeTab === 'usage' && (
                  <div className="space-y-8">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" /> Usage Analytics & Lifespans
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Message Limit Meter */}
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400 font-semibold">Monthly Messages Balance</span>
                          <span className="text-white font-extrabold">{((userDetails?.user?.usage?.messagesThisMonth / userDetails?.user?.subscription?.messageLimit) * 100 || 0).toFixed(1)}%</span>
                        </div>
                        
                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-500"
                            style={{ width: `${Math.min((userDetails?.user?.usage?.messagesThisMonth / userDetails?.user?.subscription?.messageLimit) * 100 || 0, 100)}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-xs text-gray-500 pt-1">
                          <span>Used: {userDetails?.user?.usage?.messagesThisMonth?.toLocaleString()}</span>
                          <span>Allowed: {userDetails?.user?.subscription?.messageLimit?.toLocaleString()} messages</span>
                        </div>
                      </div>

                      {/* AI Agent Credit Meter */}
                      <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400 font-semibold">Monthly Agent Credits Used</span>
                          <span className="text-white font-extrabold">{userDetails?.user?.usage?.agentCreditsUsedThisMonth?.toLocaleString() || 0} credits</span>
                        </div>
                        <p className="text-xs text-gray-500">Credits used for AI agent automation operations during this calendar billing cycle.</p>
                        <div className="pt-2 border-t border-white/5 flex justify-between text-xs text-gray-400">
                          <span>Total Credits Assigned: {userDetails?.user?.subscription?.credits || 0}</span>
                          <span>Total Max Credits: {userDetails?.user?.subscription?.totalCredits || 0}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
                      <div className="p-6 bg-white/[0.01] border border-white/5 rounded-3xl text-center">
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Lifetime Messages Sent</span>
                        <p className="text-3xl font-black text-emerald-400 mt-1">{userDetails?.user?.usage?.totalMessages?.toLocaleString() || 0}</p>
                      </div>
                      
                      <div className="p-6 bg-white/[0.01] border border-white/5 rounded-3xl text-center">
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">AI Posting Credits Used</span>
                        <p className="text-3xl font-black text-teal-400 mt-1">{userDetails?.user?.usage?.postingCreditsUsedThisMonth?.toLocaleString() || 0}</p>
                      </div>

                      <div className="p-6 bg-white/[0.01] border border-white/5 rounded-3xl text-center">
                        <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest block mb-1">Last Cycle Reset Date</span>
                        <p className="text-sm font-bold text-white mt-3">
                          {userDetails?.user?.usage?.lastResetDate ? new Date(userDetails.user.usage.lastResetDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. CHANNELS TAB */}
                {activeTab === 'channels' && (
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                      <Smartphone className="w-4 h-4 text-emerald-500" /> Connected Social Channels (A to Z)
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[
                        { 
                          name: 'WhatsApp Business', 
                          key: 'whatsapp', 
                          icon: Smartphone, 
                          color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
                          accounts: userDetails?.accounts?.whatsapp || [] 
                        },
                        { 
                          name: 'Telegram Bot API', 
                          key: 'telegram', 
                          icon: Send, 
                          color: 'bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]',
                          accounts: userDetails?.accounts?.telegram || [] 
                        },
                        { 
                          name: 'Instagram Direct', 
                          key: 'instagram', 
                          icon: Instagram, 
                          color: 'bg-pink-500/10 text-pink-500 border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.05)]',
                          accounts: userDetails?.accounts?.instagram || [] 
                        },
                        { 
                          name: 'Facebook Pages', 
                          key: 'facebook', 
                          icon: Facebook, 
                          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.05)]',
                          accounts: userDetails?.accounts?.facebook || [] 
                        },
                        { 
                          name: 'LinkedIn Professional', 
                          key: 'linkedin', 
                          icon: Linkedin, 
                          color: 'bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.05)]',
                          accounts: userDetails?.accounts?.linkedin || [] 
                        },
                        { 
                          name: 'YouTube Channels', 
                          key: 'youtube', 
                          icon: Youtube, 
                          color: 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.05)]',
                          accounts: userDetails?.accounts?.youtube || [] 
                        }
                      ].map(platform => {
                        const PlatformIcon = platform.icon;
                        const isConnected = platform.accounts.length > 0;
                        return (
                          <div key={platform.key} className={`p-6 bg-white/[0.02] border rounded-3xl flex flex-col justify-between min-h-48 transition-all hover:bg-white/[0.03] ${isConnected ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                            <div className="flex justify-between items-start">
                              <div className={`p-3 rounded-2xl ${platform.color}`}>
                                <PlatformIcon className="w-6 h-6" />
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-gray-500 border border-white/5'
                              }`}>
                                {isConnected ? `${platform.accounts.length} Connected` : 'Disconnected'}
                              </span>
                            </div>

                            <div className="mt-4">
                              <h4 className="text-sm font-bold text-white">{platform.name}</h4>
                              <div className="mt-2 space-y-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                                {platform.accounts.map((acc, i) => (
                                  <p key={acc._id || i} className="text-[10px] font-mono text-gray-400 truncate bg-white/[0.02] border border-white/5 px-2 py-1 rounded">
                                    {acc.name || acc.channelName || acc.channelId || acc.phoneNumber || acc.username || acc._id}
                                  </p>
                                ))}
                                {!isConnected && (
                                  <p className="text-[10px] text-gray-500 italic">No credentials linked yet.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 5. AI AGENTS TAB */}
                {activeTab === 'agents' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Bot className="w-4 h-4 text-emerald-500" /> Deployed Artificial Intelligence Bots ({userDetails?.agents?.length || 0})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {userDetails?.agents?.map(agent => (
                        <div key={agent._id} className="p-6 bg-white/[0.02] border border-white/10 rounded-3xl space-y-4 hover:bg-white/[0.03] transition-all">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl"><Bot className="w-5 h-5" /></div>
                              <div>
                                <h4 className="text-sm font-bold text-white">{agent.name}</h4>
                                <span className="text-[9px] font-mono text-gray-500">ID: {agent._id}</span>
                              </div>
                            </div>
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{agent.model}</span>
                          </div>

                          {agent.prompt && (
                            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                              <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest block mb-1">System instructions prompt</span>
                              <p className="text-xs text-gray-400 line-clamp-2 italic">"{agent.prompt}"</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                            <div>
                              <span className="text-gray-500 uppercase block">Platform Channel</span>
                              <span className="font-semibold text-white capitalize">{agent.platform || 'whatsapp'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 uppercase block">Temperature Level</span>
                              <span className="font-semibold text-white">{agent.temperature ?? 0.7}</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {(!userDetails?.agents || userDetails.agents.length === 0) && (
                        <div className="col-span-2 text-center py-12 text-gray-500 italic bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
                          No deployed conversational AI agents found for this user.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. BILLING & PAYMENTS TAB */}
                {activeTab === 'billing' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-white/5 pb-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <History className="w-4 h-4 text-emerald-500" /> Billing history & transaction logs
                      </h3>
                      {userDetails?.payments?.length > 0 && (
                        <div className="text-right">
                          <span className="text-[10px] text-gray-500 uppercase font-bold block">Lifetime Account Spend</span>
                          <span className="text-lg font-black text-white">
                            ₹{userDetails.payments.reduce((acc, curr) => curr.status === 'captured' ? acc + (curr.amount / 100) : acc, 0).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-sans">
                        <thead>
                          <tr className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">
                            <th className="pb-3">Transaction Date</th>
                            <th className="pb-3">Plan Tier</th>
                            <th className="pb-3">Amount</th>
                            <th className="pb-3">Razorpay payment ID</th>
                            <th className="pb-3">Transaction Status</th>
                            <th className="pb-3 text-right">Administrative overrides</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                          {userDetails?.payments?.map(payment => (
                            <tr key={payment._id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-4 font-medium text-white">{new Date(payment.createdAt).toLocaleString()}</td>
                              <td className="py-4 capitalize font-semibold text-white">{payment.plan}</td>
                              <td className="py-4 font-extrabold text-white">₹{payment.amount / 100}</td>
                              <td className="py-4 font-mono text-gray-400 select-all">{payment.razorpayPaymentId || 'N/A'}</td>
                              <td className="py-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  payment.status === 'captured' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                  payment.status === 'refunded' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                                  'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                }`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {payment.status === 'captured' && (
                                    <button
                                      onClick={() => handleRefundPayment(payment._id)}
                                      disabled={refundingPaymentId === payment._id}
                                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-500 rounded-lg text-[10px] font-bold uppercase transition-all disabled:opacity-50"
                                    >
                                      {refundingPaymentId === payment._id ? 'Refunding...' : 'Simulate Refund'}
                                    </button>
                                  )}
                                  
                                  {updatingPaymentId === payment._id ? (
                                    <div className="flex items-center gap-1 justify-end">
                                      <select
                                        value={newPaymentStatus}
                                        onChange={(e) => setNewPaymentStatus(e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px] text-white focus:outline-none"
                                      >
                                        <option value="" disabled className="bg-[#0f172a]">Status</option>
                                        <option value="captured" className="bg-[#0f172a]">Captured</option>
                                        <option value="failed" className="bg-[#0f172a]">Failed</option>
                                        <option value="refunded" className="bg-[#0f172a]">Refunded</option>
                                      </select>
                                      <button
                                        onClick={() => handleUpdatePaymentStatus(payment._id)}
                                        className="p-1 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/20 text-emerald-500"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => { setUpdatingPaymentId(null); setNewPaymentStatus(""); }}
                                        className="p-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-gray-400"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => { setUpdatingPaymentId(payment._id); setNewPaymentStatus(payment.status); }}
                                      className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-lg text-[10px] font-bold uppercase transition-all"
                                    >
                                      Change Status
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}

                          {(!userDetails?.payments || userDetails.payments.length === 0) && (
                            <tr>
                              <td colSpan="6" className="py-8 text-center text-gray-500 italic bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                No billing or payments history logs found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. CREDITS LOG TAB */}
                {activeTab === 'credits' && (
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
                      <Zap className="w-4 h-4 text-emerald-500" /> Account Credit Balance adjustment logs
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">
                            <th className="pb-3">Timestamp Date</th>
                            <th className="pb-3">Adjustment Type</th>
                            <th className="pb-3">Credits Volume</th>
                            <th className="pb-3">Operation description</th>
                            <th className="pb-3 text-right">Event Metadata</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                          {userDetails?.creditTransactions?.map(tx => (
                            <tr key={tx._id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-4 font-medium text-white">{new Date(tx.createdAt).toLocaleString()}</td>
                              <td className="py-4 capitalize">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  tx.type === 'addition' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 
                                  tx.type === 'refund' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                                  'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                }`}>
                                  {tx.type}
                                </span>
                              </td>
                              <td className={`py-4 font-extrabold ${tx.type === 'addition' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {tx.type === 'addition' ? '+' : '-'}{tx.amount?.toLocaleString()} credits
                              </td>
                              <td className="py-4 max-w-xs truncate" title={tx.description}>{tx.description}</td>
                              <td className="py-4 font-mono text-[10px] text-gray-400 text-right select-all">
                                {tx.metadata ? JSON.stringify(tx.metadata) : 'N/A'}
                              </td>
                            </tr>
                          ))}

                          {(!userDetails?.creditTransactions || userDetails.creditTransactions.length === 0) && (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-gray-500 italic bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                No credit transactions adjustment logs found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 8. SECURITY & AUDITS TAB */}
                {activeTab === 'security' && (
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/5 pb-4">
                      <AlertTriangle className="w-4 h-4 text-emerald-500" /> Real-time security events & fraud detection logs
                    </h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] text-gray-500 uppercase tracking-widest border-b border-white/5 pb-2">
                            <th className="pb-3">Event Timestamp</th>
                            <th className="pb-3">Client Network IP</th>
                            <th className="pb-3">Approx Geographic Area</th>
                            <th className="pb-3 text-center">Threat Risk Score</th>
                            <th className="pb-3">Security Action</th>
                            <th className="pb-3 text-right">Detection Reasons</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                          {userDetails?.fraudEvents?.map(event => (
                            <tr key={event._id} className="hover:bg-white/[0.01] transition-colors">
                              <td className="py-4 font-medium text-white">{new Date(event.timestamp).toLocaleString()}</td>
                              <td className="py-4 font-mono text-emerald-400 select-all flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-gray-500" />
                                {event.ip}
                              </td>
                              <td className="py-4 text-white font-medium">{event.location || 'Unknown location'}</td>
                              <td className="py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  event.riskScore >= 75 ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black' : 
                                  event.riskScore >= 40 ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold' : 
                                  'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-medium'
                                }`}>
                                  {event.riskScore}%
                                </span>
                              </td>
                              <td className="py-4 uppercase font-bold text-white">{event.action}</td>
                              <td className="py-4 text-gray-400 text-right select-all max-w-xs truncate" title={event.reasons?.join(', ')}>
                                {event.reasons?.join(', ') || 'N/A'}
                              </td>
                            </tr>
                          ))}

                          {(!userDetails?.fraudEvents || userDetails.fraudEvents.length === 0) && (
                            <tr>
                              <td colSpan="6" className="py-8 text-center text-gray-500 italic bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
                                No security or fraud threat events logged.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      ) : (
        // ==========================================
        // 📋 STANDARD USERS LIST VIEW TABLE
        // ==========================================
        <>
          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by name or email..."
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 transition-all text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto">
              <button className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-sm font-medium text-gray-300">
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02]">
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Platforms</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Subscription</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Usage</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-sm font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                        No users found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="hover:bg-white/[0.02] transition-colors group text-gray-300">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white uppercase shadow-lg shadow-emerald-900/20">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-white">{user.name}</p>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-400">{user.email}</p>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  user.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                }`}>
                                  {user.role}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {user.whatsappCount > 0 && (
                              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500" title="WhatsApp Connected">
                                <Smartphone className="w-4 h-4" />
                              </div>
                            )}
                            {user.telegramCount > 0 && (
                              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500" title="Telegram Connected">
                                <Send className="w-4 h-4" />
                              </div>
                            )}
                            {user.instagramCount > 0 && (
                              <div className="p-1.5 rounded-lg bg-pink-500/10 text-pink-500" title="Instagram Connected">
                                <Instagram className="w-4 h-4" />
                              </div>
                            )}
                            {!(user.whatsappCount || user.telegramCount || user.instagramCount) && (
                              <span className="text-xs text-gray-500 italic">None</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium w-fit mb-1 ${
                              user.subscription.plan === 'enterprise' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]' :
                              user.subscription.plan === 'pro' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]' :
                              user.subscription.plan === 'starter' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
                              'bg-gray-500/10 text-gray-400 border border-white/10'
                            }`}>
                              <CreditCard className="w-3 h-3" />
                              {user.subscription.plan.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-500">Member since {new Date(user.createdAt).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-medium text-white">{user.usage.totalMessages} messages</p>
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  (user.usage.messagesThisMonth / user.subscription.messageLimit) > 0.8 ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min((user.usage.messagesThisMonth / user.subscription.messageLimit) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                          }`}>
                            {user.isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                            {user.isActive ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => fetchUserDetails(user._id)}
                              className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all border border-white/10"
                              title="Open User Dashboard"
                            >
                              <ExternalLink className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => toggleUserStatus(user._id, user.isActive)}
                              className={`p-2 rounded-xl transition-all border ${
                                user.isActive 
                                  ? 'bg-rose-500/5 border-rose-500/10 hover:bg-rose-500/10 text-rose-500' 
                                  : 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10 text-emerald-500'
                              }`}
                              title={user.isActive ? 'Suspend User' : 'Activate User'}
                            >
                              {user.isActive ? <ShieldAlert className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {showRoleModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRoleModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-[#1e293b] border border-white/10 rounded-[2rem] p-8 shadow-2xl"
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto text-emerald-500">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white">Verify Admin Action</h3>
                <p className="text-gray-400 text-sm">
                  We've sent a 6-digit verification code to your email. Please enter it below to confirm the role change for <strong>{userDetails?.user.name}</strong> to <strong>{roleToAssign.toUpperCase()}</strong>.
                </p>
                
                <div className="mt-6">
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="Enter 6-digit OTP"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full text-center tracking-[1rem] text-2xl font-bold py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 text-white placeholder:tracking-normal placeholder:text-base placeholder:font-normal"
                  />
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setShowRoleModal(false)}
                    className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConfirmRoleChange}
                    disabled={isVerifyingOtp || otpValue.length !== 6}
                    className="flex-1 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isVerifyingOtp ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : 'Verify & Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default UserManagement;
