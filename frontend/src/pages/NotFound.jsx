import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#060a0f] text-slate-900 dark:text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,106,0,0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,106,0,0.05),transparent_60%)]" />

      <div className="relative text-center p-10 rounded-2xl bg-white/80 dark:bg-white/5 backdrop-blur-lg border border-slate-200 dark:border-[#FF6A0033] shadow-xl dark:shadow-[0_0_40px_rgba(255,106,0,0.1)]">
        {/* 404 Text */}
        <h1 className="text-[120px] font-bold text-[#FF6A00] drop-shadow-[0_0_25px_rgba(255,106,0,0.4)]">
          404
        </h1>

        <h2 className="text-2xl font-semibold mt-2">Oops! Page Not Found</h2>

        <p className="text-slate-500 dark:text-slate-400 mt-3 mb-6">
          The page you are looking for doesn't exist or has been moved.
        </p>

        {/* Button */}
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-gradient-to-r from-[#FF6A00] to-[#e05d00] text-white font-semibold rounded-xl 
          shadow-[0_0_20px_rgba(255,106,0,0.3)] 
          hover:scale-105 hover:shadow-[0_0_30px_rgba(255,106,0,0.5)] 
          transition duration-300"
        >
          Go Back Home →
        </button>
      </div>
    </div>
  );
};

export default NotFound;
