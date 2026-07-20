import { useEffect, useState } from "react";
import { whatsappAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import { Loader2, XCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function Callback() {
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const handleSignup = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");
      const errorMessage = params.get("error_message");
      const errorCode = params.get("error_code");

      if (error || errorMessage) {
        const msg = errorMessage || error || "Unknown OAuth Error";
        console.error("OAuth Error:", errorCode, msg);
        setErrorMsg(msg);
        toast.error(`Authentication failed: ${msg}`);
        setTimeout(() => navigate("/app/integrations"), 3000);
        return;
      }

      if (!code) {
        setErrorMsg("No authorization code received.");
        toast.error("No authorization code received from Facebook.");
        setTimeout(() => navigate("/app/integrations"), 3000);
        return;
      }

      try {
        const redirectUri = window.location.origin + "/callback";
        const res = await whatsappAPI.embeddedSignupCallback(code, redirectUri);

        localStorage.setItem("wa_data", JSON.stringify(res.data.data));
        toast.success("Account connected successfully!");
        navigate("/app/integrations");
      } catch (err) {
        console.error(err);
        const msg = err.response?.data?.message || err.message;
        setErrorMsg(`Signup failed: ${msg}`);
        toast.error("Signup failed: " + msg);
        setTimeout(() => navigate("/app/integrations"), 3000);
      }
    };

    handleSignup();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-md w-full p-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl text-center border border-slate-200 dark:border-white/10">
        {errorMsg ? (
          <>
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Connection Failed</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{errorMsg}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 animate-pulse">Redirecting back to integrations...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-[#FF6A00]/10 text-[#FF6A00] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Connecting Account...</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Please wait while we securely link your account. This should only take a moment.</p>
          </>
        )}
      </div>
    </div>
  );
}
