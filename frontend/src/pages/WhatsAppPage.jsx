import React, { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Smartphone,
  Plus,
  RefreshCw,
  Trash2,
  Loader2,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Zap,
  X,
} from "lucide-react";
import { whatsappAPI } from "../services/api";
import toast from "react-hot-toast";

const META_APP_ID = process.env.REACT_APP_META_APP_ID;
const META_CONFIG_ID = process.env.REACT_APP_META_CONFIG_ID;

const connectSchema = z.object({
  phoneNumberId: z.string().min(5, "Required"),
  wabaId: z.string().min(5, "Required"),
  accessToken: z.string().min(10, "Required"),
  displayPhoneNumber: z.string().min(7, "Required"),
  verifiedName: z.string().optional(),
});

const StatusBadge = ({ status, isDark }) => {
  const map = {
    connected: { color: isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-green-100 text-green-700", dot: "bg-green-500", label: "Connected" },
    disconnected: { color: isDark ? "bg-white/10 text-slate-300" : "bg-gray-100 text-gray-600", dot: "bg-gray-400", label: "Disconnected" },
    pending: { color: isDark ? "bg-amber-500/20 text-amber-300" : "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500", label: "Pending" },
    error: { color: isDark ? "bg-rose-500/20 text-rose-300" : "bg-red-100 text-red-700", dot: "bg-red-500", label: "Error" },
  };
  const s = map[status] || map.disconnected;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

function EmbeddedSignupButton({ onSuccess }) {
  const [step, setStep] = useState("idle");
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [longLivedToken, setLongLivedToken] = useState("");
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const storedData = localStorage.getItem("wa_data");
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        setLongLivedToken(parsed.longLivedToken);
        setPhoneNumbers(parsed.phoneNumbers || []);
        if (parsed.phoneNumbers && parsed.phoneNumbers.length > 0) {
          setStep("picking");
        }
      } catch (err) {
        console.error("Failed to parse wa_data", err);
      }
      localStorage.removeItem("wa_data");
    }

    import('../utils/scriptLoader').then(({ loadFbSdk }) => loadFbSdk().catch(() => {}));
  }, []);

  const launchSignup = useCallback(() => {
    if (!META_APP_ID) {
      toast.error("META APP ID missing");
      return;
    }

    const redirectUriUrl = window.location.origin + "/callback";
    const redirectUri = encodeURIComponent(redirectUriUrl);

    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${redirectUri}&response_type=code&config_id=${META_CONFIG_ID}&scope=whatsapp_business_management,whatsapp_business_messaging`;

    window.location.href = url;
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await whatsappAPI.embeddedSignupSave({ ...selected, accessToken: longLivedToken });
      toast.success(res.data.message || "Number connected!");
      onSuccess(res.data.data.account);
      setStep("idle");
      setSelected(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (step === "picking") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Select a WhatsApp Number</h3>
          <button onClick={() => setStep("idle")} className="p-1.5 rounded-lg hover:bg-gray-100"><X size={16} /></button>
        </div>
        {phoneNumbers.length === 0 ? (
          <div className="text-center py-6 text-gray-400">
            <Smartphone size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No numbers found. Add one in Meta Business Manager.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-5">
            {phoneNumbers.map((phone) => (
              <button
                key={phone.phoneNumberId}
                onClick={() => setSelected(phone)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selected?.phoneNumberId === phone.phoneNumberId ? "border-[#FF6A00] bg-orange-50" : "border-gray-100 hover:border-gray-300"}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{phone.displayPhoneNumber}</p>
                    <p className="text-xs text-gray-500">{phone.verifiedName}</p>
                    <p className="text-xs text-gray-400 font-mono">WABA: {phone.wabaId}</p>
                  </div>
                  {selected?.phoneNumberId === phone.phoneNumberId && <CheckCircle2 size={20} className="text-[#FF6A00]" />}
                </div>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={handleSave} disabled={!selected || saving} className="flex-1 flex items-center justify-center gap-2 text-white py-3 rounded-xl font-medium disabled:opacity-50 transition-colors" style={{ background: '#FF6A00' }}>
            {saving ? <><Loader2 size={15} className="animate-spin" /> Connecting...</> : "Connect Number"}
          </button>
          <button onClick={() => setStep("idle")} className="px-5 py-3 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <button onClick={launchSignup} disabled={step === "loading"} className="w-full flex items-center justify-center gap-3 text-white font-semibold py-4 rounded-2xl transition-all disabled:opacity-70 shadow-lg shadow-orange-300/30" style={{ background: '#FF6A00' }}>
      {step === "loading" ? <><Loader2 size={20} className="animate-spin" /> Opening Facebook...</> : <><Smartphone size={20} /> Connect via Facebook — Embedded Signup</>}
    </button>
  );
}

function ManualConnectForm({ onSuccess, onCancel }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(connectSchema) });
  const onSubmit = async (data) => {
    try {
      const res = await whatsappAPI.connect(data);
      toast.success(res.data.message || "Account saved!");
      onSuccess(res.data.data.account);
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || "Connection failed");
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t border-gray-100">
      <div className="grid sm:grid-cols-2 gap-4">
        {[{ name: "phoneNumberId", label: "Phone Number ID", placeholder: "1234567890123" }, { name: "wabaId", label: "WABA ID", placeholder: "1234567890123" }, { name: "displayPhoneNumber", label: "Phone Number", placeholder: "+91 98765 43210" }, { name: "verifiedName", label: "Business Name (optional)", placeholder: "My Business" }].map((f) => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
            <input {...register(f.name)} placeholder={f.placeholder} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-[#FF6A00]" />
            {errors[f.name] && <p className="text-red-500 text-xs mt-1">{errors[f.name].message}</p>}
          </div>
        ))}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Access Token</label>
          <textarea {...register("accessToken")} rows={3} placeholder="EAABm..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-[#FF6A00] resize-none" />
          {errors.accessToken && <p className="text-red-500 text-xs mt-1">{errors.accessToken.message}</p>}
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting} className="flex items-center gap-2 text-white px-6 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 transition-colors" style={{ background: '#FF6A00' }}>
          {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Connecting...</> : "Connect Manually"}
        </button>
        <button type="button" onClick={onCancel} className="px-6 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  );
}

export default function WhatsAppPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [isDark, setIsDark] = useState((localStorage.getItem('app-theme') || 'dark') === 'dark');

  useEffect(() => {
    fetchAccounts();
    const storedData = localStorage.getItem("wa_data");
    if (storedData) setShowAddPanel(true);

    const sync = () => setIsDark((localStorage.getItem('app-theme') || 'dark') === 'dark');
    window.addEventListener('app-theme-change', sync);
    return () => window.removeEventListener('app-theme-change', sync);
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await whatsappAPI.getAll();
      setAccounts(res.data.data.accounts);
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleNewAccount = (account) => {
    setAccounts((prev) => {
      const exists = prev.find((a) => a._id === account._id);
      return exists ? prev.map((a) => (a._id === account._id ? account : a)) : [...prev, account];
    });
    setShowAddPanel(false);
    setShowManual(false);
  };

  const handleVerify = async (id) => {
    setVerifying(id);
    try {
      const res = await whatsappAPI.verify(id);
      setAccounts((prev) => prev.map((a) => (a._id === id ? res.data.data.account : a)));
      toast.success("Verified!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(null);
    }
  };

  const handleDisconnect = async (id) => {
    if (!window.confirm("Disconnect this account?")) return;
    try {
      await whatsappAPI.disconnect(id);
      setAccounts((prev) => prev.filter((a) => a._id !== id));
      toast.success("Disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>WhatsApp Accounts</h2>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Connect your WhatsApp Business numbers</p>
        </div>
        <button onClick={() => { setShowAddPanel(!showAddPanel); setShowManual(false); }} className="flex items-center gap-2 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ background: '#FF6A00' }}>
          <Plus size={16} /> Add Number
        </button>
      </div>

      {showAddPanel && (
        <div className={`rounded-2xl border p-6 space-y-5 animate-slide-up ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-800'}`}>Connect WhatsApp Number</h2>
            <button onClick={() => setShowAddPanel(false)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}><X size={16} /></button>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recommended</span>
              <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>One-click via Facebook — no manual IDs needed</p>
            </div>
            <EmbeddedSignupButton onSuccess={handleNewAccount} />
          </div>
          <div className="flex items-center gap-3"><div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">ya manually</span><div className="flex-1 h-px bg-gray-200" /></div>
          <button onClick={() => setShowManual(!showManual)} className={`flex items-center justify-between w-full text-sm ${isDark ? 'text-slate-300 hover:text-slate-100' : 'text-gray-600 hover:text-gray-800'}`}>
            <span className="font-medium">Manual setup (advanced)</span>
            {showManual ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showManual && <ManualConnectForm onSuccess={handleNewAccount} onCancel={() => setShowManual(false)} />}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="w-8 h-8 border-4 border-[#FF6A00] border-t-transparent rounded-full animate-spin" /></div>
      ) : accounts.length === 0 ? (
        <div className={`rounded-2xl border border-dashed p-14 text-center ${isDark ? 'bg-white/5 border-white/20' : 'bg-white border-gray-300'}`}>
          <Smartphone size={48} className={`mx-auto mb-4 ${isDark ? 'text-slate-500' : 'text-gray-300'}`} />
          <h3 className={`font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>No accounts connected</h3>
          <p className={`text-sm mt-1 mb-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>Connect your first WhatsApp Business number.</p>
          <button onClick={() => setShowAddPanel(true)} className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: '#FF6A00' }}><Zap size={15} /> Connect Number</button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc._id} className={`rounded-2xl border p-5 transition-shadow ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FF6A0022' }}>
                    <Smartphone size={22} style={{ color: '#FF6A00' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{acc.displayPhoneNumber}</p>
                      <StatusBadge status={acc.status} isDark={isDark} />
                    </div>
                    {acc.verifiedName && <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>{acc.verifiedName}</p>}
                    <p className={`text-xs font-mono mt-1 ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>ID: {acc.phoneNumberId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleVerify(acc._id)} disabled={verifying === acc._id} title="Re-verify" className="p-2 rounded-xl hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors">
                    {verifying === acc._id ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  </button>
                  <button onClick={() => handleDisconnect(acc._id)} title="Disconnect" className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={`rounded-2xl p-5 border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex gap-3">
          <Info size={16} className="text-gray-400 mt-0.5 shrink-0" />
          <div>
            <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>Embedded Signup setup (ek baar karna hai)</p>
            <ol className={`text-xs space-y-1.5 list-decimal list-inside ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <li>Frontend .env: REACT_APP_META_APP_ID and REACT_APP_META_CONFIG_ID</li>
              <li>Backend .env: META_APP_ID and META_APP_SECRET</li>
              <li>Meta App -> Facebook Login for Business product enable</li>
              <li>Add valid OAuth Redirect URIs</li>
              <li>Enable Embedded Signup in Meta WhatsApp config</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
