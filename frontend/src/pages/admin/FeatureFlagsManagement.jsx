import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Flag,
  ToggleLeft, 
  ToggleRight,
  Plus, 
  Trash2, 
  Edit3, 
  X, 
  Check, 
  HelpCircle,
  Users, 
  Sliders, 
  ShieldCheck, 
  Layers, 
  Activity, 
  SearchCode,
  UserCheck,
  UserX,
  AlertCircle
} from "lucide-react";
import { featureFlagAPI, adminAPI } from "../../services/api";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const FeatureFlagsManagement = () => {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedFlag, setSelectedFlag] = useState(null);

  // Form states
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rolloutPercentage, setRolloutPercentage] = useState(100);
  const [betaOnly, setBetaOnly] = useState(false);
  const [targetPlans, setTargetPlans] = useState([]);
  const [targetEmailsText, setTargetEmailsText] = useState("");

  // Beta Tester Promoter states
  const [betaSearchEmail, setBetaSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState(null);
  const [betaSearchLoading, setBetaSearchLoading] = useState(false);
  const [betaTesters, setBetaTesters] = useState([]);
  const [loadingBetaTesters, setLoadingBetaTesters] = useState(false);

  useEffect(() => {
    fetchFlags();
    fetchBetaTesters();
  }, []);

  const fetchBetaTesters = async () => {
    setLoadingBetaTesters(true);
    try {
      const res = await featureFlagAPI.getBetaTesters();
      setBetaTesters(res.data.data.betaTesters || []);
    } catch (err) {
      toast.error("Failed to load beta testers list");
    } finally {
      setLoadingBetaTesters(false);
    }
  };

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const res = await featureFlagAPI.getAll();
      setFlags(res.data.data.flags || []);
    } catch (err) {
      toast.error("Failed to fetch feature flags");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setModalMode("create");
    setSelectedFlag(null);
    setKey("");
    setName("");
    setDescription("");
    setIsActive(true);
    setRolloutPercentage(100);
    setBetaOnly(false);
    setTargetPlans([]);
    setTargetEmailsText("");
    setShowModal(true);
  };

  const handleOpenEditModal = (flag) => {
    setModalMode("edit");
    setSelectedFlag(flag);
    setKey(flag.key);
    setName(flag.name);
    setDescription(flag.description || "");
    setIsActive(flag.isActive);
    setRolloutPercentage(flag.rules?.rolloutPercentage ?? 100);
    setBetaOnly(flag.rules?.betaOnly ?? false);
    setTargetPlans(flag.rules?.targetPlans || []);
    setTargetEmailsText(flag.rules?.targetEmails?.join(", ") || "");
    setShowModal(true);
  };

  const handleTogglePlan = (plan) => {
    if (targetPlans.includes(plan)) {
      setTargetPlans(targetPlans.filter((p) => p !== plan));
    } else {
      setTargetPlans([...targetPlans, plan]);
    }
  };

  const handleToggleActive = async (flagId, currentStatus) => {
    try {
      const res = await featureFlagAPI.toggle(flagId);
      toast.success(res.data.message || `Feature flag toggled successfully`);
      
      setFlags(flags.map(f => f._id === flagId ? { ...f, isActive: !currentStatus } : f));
    } catch (err) {
      toast.error("Failed to toggle feature flag");
    }
  };

  const handleDeleteFlag = async (flagId, flagKey) => {
    if (!window.confirm(`Are you absolutely sure you want to delete feature flag '${flagKey}'? This will disable the feature for all users immediately.`)) return;

    try {
      await featureFlagAPI.delete(flagId);
      toast.success("Feature flag deleted successfully");
      setFlags(flags.filter((f) => f._id !== flagId));
    } catch (err) {
      toast.error("Failed to delete feature flag");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key.trim() || !name.trim()) {
      toast.error("Key and Name are required fields.");
      return;
    }

    const emailsArray = targetEmailsText
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email.length > 0);

    const payload = {
      key: key.toLowerCase().trim(),
      name: name.trim(),
      description: description.trim(),
      isActive,
      rules: {
        rolloutPercentage: Number(rolloutPercentage),
        betaOnly,
        targetPlans,
        targetEmails: emailsArray
      }
    };

    try {
      if (modalMode === "create") {
        await featureFlagAPI.create(payload);
        toast.success("Feature flag created successfully!");
      } else {
        await featureFlagAPI.update(selectedFlag._id, payload);
        toast.success("Feature flag updated successfully!");
      }
      setShowModal(false);
      fetchFlags();
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred");
    }
  };

  const handleSearchBetaUser = async () => {
    if (!betaSearchEmail.trim()) {
      toast.error("Please enter an email address to search");
      return;
    }
    setBetaSearchLoading(true);
    setFoundUser(null);
    try {
      const res = await adminAPI.getUsers();
      const users = res.data.data.users || [];
      const user = users.find(u => u.email.toLowerCase() === betaSearchEmail.toLowerCase().trim());
      if (user) {
        setFoundUser(user);
        toast.success("User found!");
      } else {
        toast.error("No user found with this email in the system.");
      }
    } catch (err) {
      toast.error("Failed to search user database");
    } finally {
      setBetaSearchLoading(false);
    }
  };

  const handleSetBetaStatus = async (userId, email, newStatus) => {
    try {
      await featureFlagAPI.setUserBeta(userId, newStatus);
      toast.success(`Beta status ${newStatus ? 'ENABLED' : 'DISABLED'} for ${email}`);
      
      // Update foundUser if it is the same user
      if (foundUser && foundUser._id === userId) {
        setFoundUser({ ...foundUser, isBetaTester: newStatus });
      }
      
      // Refresh persistent list
      fetchBetaTesters();
      
      // Clear search input if successful
      setBetaSearchEmail("");
    } catch (err) {
      toast.error("Failed to update beta status");
    }
  };

  const handleToggleBetaStatus = async () => {
    if (!foundUser) return;
    await handleSetBetaStatus(foundUser._id, foundUser.email, !foundUser.isBetaTester);
  };

  const filteredFlags = flags.filter(flag => 
    flag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    flag.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (flag.description && flag.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const activeFlagsCount = flags.filter(f => f.isActive).length;

  return (
    <div className="space-y-6">
      {/* Cards stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute right-4 top-4 p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl group-hover:scale-110 transition-transform">
            <Flag className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-400">Total Feature Flags</p>
          <p className="text-3xl font-black text-white mt-2">{flags.length}</p>
          <div className="text-[10px] text-gray-500 mt-2">Core system parameters</div>
        </div>

        <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute right-4 top-4 p-3 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
            <Activity className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-400">Active / Live Flags</p>
          <p className="text-3xl font-black text-blue-500 mt-2">{activeFlagsCount}</p>
          <div className="text-[10px] text-gray-500 mt-2">Evaluating in production</div>
        </div>

        <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute right-4 top-4 p-3 bg-rose-500/10 text-rose-500 rounded-2xl group-hover:scale-110 transition-transform">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-400">Rollbacks / Paused</p>
          <p className="text-3xl font-black text-rose-500 mt-2">{flags.length - activeFlagsCount}</p>
          <div className="text-[10px] text-gray-500 mt-2">Instantly rolled back/disabled</div>
        </div>

        <div className="p-6 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-sm relative overflow-hidden group">
          <div className="absolute right-4 top-4 p-3 bg-purple-500/10 text-purple-500 rounded-2xl group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-gray-400">Targeting Capacity</p>
          <p className="text-3xl font-black text-purple-500 mt-2">Multi-Tier</p>
          <div className="text-[10px] text-gray-500 mt-2">Percentage, Plans, Users, Beta</div>
        </div>
      </div>

      {/* Beta Tester Quick Manager & Search Feature Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Beta Tester Promoter */}
        <div className="lg:col-span-1 p-6 bg-white/[0.03] border border-white/10 rounded-3xl backdrop-blur-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-500" /> Beta Tester Promoter
          </h3>
          <p className="text-xs text-gray-500">
            Promote standard users to Beta Testers. They will automatically get whitelisted for flags with "Beta Only" targeting enabled.
          </p>
          
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="user@example.com"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
              value={betaSearchEmail}
              onChange={(e) => setBetaSearchEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchBetaUser()}
            />
            <button
              onClick={handleSearchBetaUser}
              disabled={betaSearchLoading}
              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 rounded-xl font-semibold text-xs transition-all flex items-center justify-center"
            >
              {betaSearchLoading ? "Searching..." : "Search"}
            </button>
          </div>

          {foundUser && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-white">{foundUser.name}</p>
                <p className="text-[10px] text-gray-400">{foundUser.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    {foundUser.subscription?.plan || 'free'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                    foundUser.isBetaTester ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' : 'bg-gray-500/10 text-gray-500 border border-white/5'
                  }`}>
                    {foundUser.isBetaTester ? 'Beta Tester' : 'Standard User'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleToggleBetaStatus}
                className={`px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 border ${
                  foundUser.isBetaTester 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                }`}
              >
                {foundUser.isBetaTester ? (
                  <>
                    <UserX size={12} /> Demote
                  </>
                ) : (
                  <>
                    <UserCheck size={12} /> Promote
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* Persistent Beta Testers List */}
          <div className="border-t border-white/5 pt-4 space-y-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Active Beta Testers ({betaTesters.length})</span>
              {loadingBetaTesters && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-emerald-500"></div>
              )}
            </h4>

            <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loadingBetaTesters && betaTesters.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500 mx-auto mb-2"></div>
                  Loading list...
                </div>
              ) : betaTesters.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500 italic bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                  No active beta testers found.
                </div>
              ) : (
                betaTesters.map((tester) => (
                  <div 
                    key={tester._id} 
                    className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between hover:bg-white/[0.02] transition-all group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-xs font-bold text-white truncate">{tester.name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{tester.email}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          {tester.subscription?.plan || 'free'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSetBetaStatus(tester._id, tester.email, false)}
                      className="p-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 text-rose-500 rounded-lg transition-all opacity-60 group-hover:opacity-100"
                      title="Demote (Remove from Beta)"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Search & Add Flags */}
        <div className="lg:col-span-2 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/[0.03] border border-white/10 rounded-3xl p-6 backdrop-blur-sm">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search feature flags by key, name, rules..."
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-emerald-500/50 transition-all text-white placeholder:text-gray-500 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-500/15 hover:shadow-emerald-500/25 transition-all w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            Create Feature Flag
          </button>
        </div>
      </div>

      {/* Feature Flags Table */}
      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Global Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Targeting Rules</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Evaluation Stats</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredFlags.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400 text-sm">
                    No feature flags found matching search query.
                  </td>
                </tr>
              ) : (
                filteredFlags.map((flag) => (
                  <tr key={flag._id} className="hover:bg-white/[0.02] transition-colors group text-gray-300">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/10 text-emerald-400 flex items-center justify-center font-bold border border-emerald-500/20">
                          <Flag className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{flag.name}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] font-mono text-gray-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{flag.key}</p>
                            {flag.description && (
                              <p className="text-xs text-gray-400 max-w-[200px] truncate" title={flag.description}>
                                {flag.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleActive(flag._id, flag.isActive)}
                          className={`p-1.5 rounded-full transition-all border ${
                            flag.isActive 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                          }`}
                          title={flag.isActive ? "Instant Rollback (Kill Switch)" : "Enable Feature"}
                        >
                          {flag.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          flag.isActive ? 'text-emerald-500' : 'text-rose-500'
                        }`}>
                          {flag.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                        {/* Beta Rule */}
                        {flag.rules?.betaOnly && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase">
                            Beta Only
                          </span>
                        )}
                        
                        {/* Percentage Rollout */}
                        {flag.rules?.rolloutPercentage !== undefined && flag.rules.rolloutPercentage < 100 && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase flex items-center gap-1">
                            <Sliders size={8} /> {flag.rules.rolloutPercentage}% Rollout
                          </span>
                        )}
                        {flag.rules?.rolloutPercentage === 100 && !flag.rules.betaOnly && !flag.rules.targetPlans?.length && !flag.rules.targetEmails?.length && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase">
                            All Users
                          </span>
                        )}

                        {/* Plan limits */}
                        {flag.rules?.targetPlans?.map((plan) => (
                          <span key={plan} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                            Plan: {plan}
                          </span>
                        ))}

                        {/* Direct target emails */}
                        {flag.rules?.targetEmails?.length > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase">
                            Overrides: {flag.rules.targetEmails.length} Emails
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col text-[10px]">
                          <span className="text-emerald-400 font-bold">Enabled: {flag.evalStats?.enabledCount || 0}</span>
                          <span className="text-gray-500">Disabled: {flag.evalStats?.disabledCount || 0}</span>
                        </div>
                        <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-emerald-500 h-full"
                            style={{ 
                              width: `${((flag.evalStats?.enabledCount || 0) / Math.max((flag.evalStats?.enabledCount || 0) + (flag.evalStats?.disabledCount || 0), 1)) * 100}%` 
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(flag)}
                          className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-all border border-white/10"
                          title="Edit Rules"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteFlag(flag._id, flag.key)}
                          className="p-2 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl text-rose-500 transition-all"
                          title="Delete Feature Flag"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Feature Flag Form Modal (Create or Edit) */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-[#030712]/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl shadow-emerald-500/10"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center font-bold text-white shadow-xl shadow-emerald-500/20">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {modalMode === "create" ? "Create Feature Flag" : `Edit Flag: ${key}`}
                    </h2>
                    <p className="text-xs text-gray-400">Configure feature toggles and deployment targeting rules</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 max-h-[70vh] overflow-y-auto space-y-5 custom-scrollbar">
                
                {/* Key and Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                      Flag Identifier Key *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ai-assistant-beta"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                      value={key}
                      onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AI Response Assistant"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="Describe what feature this flag enables or what component it governs..."
                    rows="2"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Global Status Kill Switch */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-white">Global Active Switch</p>
                    <p className="text-[10px] text-gray-500">If disabled, the feature is immediately blocked for all users (Kill Switch).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`p-1 rounded-full transition-all ${
                      isActive ? 'text-emerald-500' : 'text-rose-500'
                    }`}
                  >
                    {isActive ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                  </button>
                </div>

                {/* Targeting Rules Wrapper */}
                <div className="border-t border-white/5 pt-5 space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-emerald-500" /> Staged Rollout & Targeting Rules
                  </h3>

                  {/* Private Beta Checkbox */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="betaOnly"
                      className="w-4 h-4 bg-white/5 border border-white/10 rounded focus:ring-0 text-emerald-500"
                      checked={betaOnly}
                      onChange={(e) => setBetaOnly(e.target.checked)}
                    />
                    <label htmlFor="betaOnly" className="text-xs text-gray-300 font-medium select-none cursor-pointer">
                      Beta Access Only (Restrict to designated Beta Testers and Admins)
                    </label>
                  </div>

                  {/* Staged Rollout Percentage Slider */}
                  <div className="space-y-2 p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-white flex items-center gap-1.5">
                        Staged Rollout Percentage
                      </label>
                      <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {rolloutPercentage}%
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Gradually expose the feature to a random subset of users deterministically. (0 = Disabled, 100 = All Users matching rules).
                    </p>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
                      value={rolloutPercentage}
                      onChange={(e) => setRolloutPercentage(e.target.value)}
                    />
                  </div>

                  {/* Plan Whitelisting */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold block">
                      Target Subscription Plans
                    </label>
                    <p className="text-[10px] text-gray-500 mb-2">
                      Select which user tiers can access this feature. If none are selected, it applies to all plans.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {["free", "starter", "pro", "enterprise"].map((plan) => {
                        const isSelected = targetPlans.includes(plan);
                        return (
                          <button
                            type="button"
                            key={plan}
                            onClick={() => handleTogglePlan(plan)}
                            className={`py-2 px-3 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                              isSelected 
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/5' 
                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                            }`}
                          >
                            {isSelected && <Check size={10} />}
                            {plan}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Direct Email Whitelists */}
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1">
                      Individual User Overrides (Comma-separated emails)
                    </label>
                    <p className="text-[10px] text-gray-500 mb-2">
                      Whitelisted users bypass percentage and plan rules. Perfect for developers, internal stakeholders, or specific early-adopters.
                    </p>
                    <textarea
                      placeholder="e.g. dev@company.com, tester@company.com, customer@vip.com"
                      rows="3"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
                      value={targetEmailsText}
                      onChange={(e) => setTargetEmailsText(e.target.value)}
                    />
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex gap-3 pt-4 border-t border-white/5 justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium text-xs transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs shadow-lg shadow-emerald-500/10 transition-all"
                  >
                    {modalMode === "create" ? "Create Flag" : "Save Changes"}
                  </button>
                </div>
              </form>
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

export default FeatureFlagsManagement;
