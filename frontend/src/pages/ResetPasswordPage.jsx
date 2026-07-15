import React, { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { MessageSquare, Loader2 } from "lucide-react";
import { authAPI } from "../services/api";
import toast from "react-hot-toast";
import { BackgroundElements } from "./AuthPages";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, {
        password,
        confirmPassword: confirm,
      });
      toast.success("Password reset successfully!");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a0f] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <BackgroundElements />

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        <div className="bg-[rgba(255,255,255,0.04)] backdrop-blur-xl border border-[rgba(37,211,102,0.18)] rounded-3xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:border-[rgba(37,211,102,0.35)] hover:shadow-[0_0_40px_rgba(37,211,102,0.15)] transition-all duration-500">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 bg-gradient-to-br from-[#25D366] to-[#1aab52] shadow-[0_0_20px_rgba(37,211,102,0.4)] animate-pulse-slow hover:scale-110 transition-transform cursor-pointer">
              <MessageSquare size={24} className="text-[#060a0f]" />
            </div>
            <h1 className="text-3xl font-[800] text-[#e8f5ee] tracking-tight">Set New Password</h1>
            <p className="text-[#7a9b8a] mt-2 text-sm font-medium">Create a new secure password</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {[
              { label: "New Password", val: password, set: setPassword },
              { label: "Confirm Password", val: confirm, set: setConfirm },
            ].map((f) => (
              <div key={f.label} className="group">
                <label className="block text-xs font-semibold text-[#7a9b8a] uppercase tracking-wider mb-2 group-focus-within:text-[#25D366] transition-colors">
                  {f.label}
                </label>
                <input
                  type="password"
                  value={f.val}
                  onChange={(e) => f.set(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#060a0f]/50 border border-[rgba(37,211,102,0.18)] rounded-xl text-[#e8f5ee] placeholder-[#7a9b8a]/50 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366] hover:border-[#25D366]/60 transition-all focus:scale-[1.01]"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#25D366] to-[#1aab52] text-[#060a0f] font-bold tracking-wide py-3.5 rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(37,211,102,0.3)] hover:shadow-[0_0_35px_rgba(37,211,102,0.6)] hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Resetting...
                </>
              ) : (
                "Reset Password →"
              )}
            </button>
            <p className="text-center text-sm text-[#7a9b8a] mt-8">
              <Link to="/login" className="text-[#25D366] font-semibold hover:text-[#e8f5ee] hover:drop-shadow-[0_0_8px_rgba(37,211,102,0.8)] transition-all">
                Back to login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
