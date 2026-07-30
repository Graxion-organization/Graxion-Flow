import React, { useState, useEffect } from "react";
import { adminAPI } from "../../services/api";
import { 
  UserCheck, 
  ShieldAlert, 
  Trash2, 
  Loader2, 
  Check, 
  X, 
  Mail, 
  Clock, 
  Key, 
  Copy,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";

const AdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // OTP Modal State
  const [otpModal, setOtpModal] = useState({
    isOpen: false,
    requestId: null,
    email: "",
    otpCode: "",
    verifying: false,
    accessKey: null, // Stores newly created admin's key
    otpToken: "" // Stores security token
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSignupRequests();
      setRequests(res.data.data.requests || []);
    } catch (err) {
      toast.error("Failed to fetch pending admin requests");
    } finally {
      setLoading(false);
    }
  };

  const handleStartApproval = async (id, email) => {
    setProcessingId(id);
    try {
      const res = await adminAPI.sendSignupRequestOTP(id);
      toast.success(res.data.message || "OTP code sent to your admin email.");
      setOtpModal({
        isOpen: true,
        requestId: id,
        email: email,
        otpCode: "",
        verifying: false,
        accessKey: null,
        otpToken: res.data.otpToken || res.data.data?.otpToken || ""
      });
    } catch (err) {
      // toast is automatically triggered by axios interceptor if any
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyAndApprove = async (e) => {
    e.preventDefault();
    if (!otpModal.otpCode || otpModal.otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP code");
      return;
    }

    setOtpModal(prev => ({ ...prev, verifying: true }));
    try {
      const res = await adminAPI.approveSignupRequest(otpModal.requestId, { 
        otpCode: otpModal.otpCode,
        otpToken: otpModal.otpToken
      });
      const createdKey = res.data.data?.adminAccessKey || "ADM-TEMP-KEY";
      toast.success("Admin signup request approved successfully!");
      
      setOtpModal(prev => ({
        ...prev,
        verifying: false,
        accessKey: createdKey
      }));
      
      fetchRequests();
    } catch (err) {
      setOtpModal(prev => ({ ...prev, verifying: false }));
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Are you sure you want to reject this signup request? It will be permanently deleted.")) {
      return;
    }

    setProcessingId(id);
    try {
      const res = await adminAPI.rejectSignupRequest(id);
      toast.success(res.data.message || "Signup request rejected.");
      fetchRequests();
    } catch (err) {
      // error handled by axios interceptor
    } finally {
      setProcessingId(null);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Access key copied to clipboard!");
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-200">Pending Enrollment Requests</h2>
          <p className="text-sm text-gray-400 mt-1">Review, approve, or reject pending administrator enrollment requests.</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/10">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Submitted At</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Expiration</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-32"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-24"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-20"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-16"></div></td>
                    <td className="px-6 py-5"><div className="h-4 bg-white/10 rounded w-28 ml-auto"></div></td>
                  </tr>
                ))
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <UserCheck size={24} />
                      </div>
                      <p className="font-semibold text-gray-300">All caught up!</p>
                      <p className="text-xs text-gray-500 max-w-sm leading-relaxed">There are no pending administrator signup requests waiting for approval.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const createdAt = new Date(req.createdAt);
                  const expiresAt = new Date(createdAt.getTime() + 60 * 60 * 1000);
                  const now = new Date();
                  const minsRemaining = Math.max(0, Math.ceil((expiresAt - now) / 60000));
                  
                  return (
                    <tr key={req._id} className="hover:bg-white/[0.01] transition-colors border-transparent hover:border-white/5">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold">
                            {req.name ? req.name[0].toUpperCase() : "A"}
                          </div>
                          <div>
                            <p className="font-bold text-gray-200">{req.name || "Unknown Candidate"}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1.5 mt-0.5">
                              <Mail size={12} className="text-gray-500" />
                              {req.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-sm text-gray-300">
                          <Clock size={14} className="text-gray-500" />
                          {format(createdAt, "MMM dd, hh:mm a")}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          minsRemaining < 15 
                            ? "bg-red-500/10 text-red-400 border-red-500/20 animate-pulse" 
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {minsRemaining} mins left
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReject(req._id)}
                            disabled={processingId !== null}
                            className="inline-flex items-center justify-center p-2.5 text-red-400 hover:text-white hover:bg-red-500/10 rounded-xl border border-red-500/20 hover:border-red-500/30 transition-all active:scale-95 disabled:opacity-50"
                            title="Reject & Discard"
                          >
                            {processingId === req._id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                          </button>
                          
                          <button
                            onClick={() => handleStartApproval(req._id, req.email)}
                            disabled={processingId !== null}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all active:scale-95 disabled:opacity-50"
                          >
                            {processingId === req._id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                            Approve Request
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OTP Verification & Success Modal */}
      {otpModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500" />
            
            {!otpModal.accessKey ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShieldAlert size={24} />
                  </div>
                  <button 
                    onClick={() => setOtpModal(prev => ({ ...prev, isOpen: false }))}
                    className="p-1 text-gray-500 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <h3 className="text-xl font-bold text-gray-200">Security Authorization Required</h3>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                  To approve <span className="text-emerald-400 font-semibold">{otpModal.email}</span> as a new system administrator, 
                  please enter the 6-digit verification code sent to your administrative email.
                </p>

                <form onSubmit={handleVerifyAndApprove} className="mt-6 space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-widest">
                      Admin Verification OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpModal.otpCode}
                      onChange={(e) => setOtpModal(prev => ({ ...prev, otpCode: e.target.value.replace(/\D/g, "") }))}
                      placeholder="0 0 0 0 0 0"
                      className="w-full text-center tracking-[0.7em] font-mono text-2xl px-4 py-4 bg-black border border-white/10 rounded-2xl text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpModal.verifying || otpModal.otpCode.length !== 6}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {otpModal.verifying ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <UserCheck size={18} />
                        VERIFY & AUTHORIZE
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              // Access Key Success State
              <div className="text-center py-4 space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)] mb-2 animate-bounce">
                  <CheckCircle size={36} />
                </div>
                
                <div>
                  <h3 className="text-2xl font-black text-gray-100 tracking-tight">Admin Enrollment Authorized</h3>
                  <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                    The credentials have been verified and activated. A unique cryptographic access key has been successfully minted for this administrator.
                  </p>
                </div>

                <div className="bg-[#030712] border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                    <Key size={12} className="text-emerald-400" />
                    Minted Admin Access Key
                  </div>
                  <div className="font-mono text-xl font-bold text-emerald-400 select-all tracking-wider">
                    {otpModal.accessKey}
                  </div>
                  <button
                    onClick={() => copyToClipboard(otpModal.accessKey)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:text-white transition-all active:scale-95"
                  >
                    <Copy size={12} />
                    Copy Access Key
                  </button>
                </div>

                <div className="text-[11px] text-amber-500/80 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 leading-relaxed flex gap-2 text-left">
                  <AlertCircle size={16} className="shrink-0 text-amber-500" />
                  <span>
                    <strong>Important:</strong> This is a secure audit key that must be saved securely. The new administrator has also been notified via email.
                  </span>
                </div>

                <button
                  onClick={() => setOtpModal(prev => ({ ...prev, isOpen: false, accessKey: null }))}
                  className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3.5 rounded-2xl transition-colors border border-white/10 mt-2"
                >
                  DISMISS & CONTINUE
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRequests;
