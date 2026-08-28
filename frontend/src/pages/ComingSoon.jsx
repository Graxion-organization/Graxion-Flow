import React from "react";
import { useNavigate } from "react-router-dom";

export default function ComingSoon() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#060a0f] text-slate-900 dark:text-white text-center px-6">
      <div className="w-20 h-20 rounded-2xl bg-[#FF6A00]/10 border-2 border-[#FF6A00]/20 flex items-center justify-center text-4xl mb-8">
        🚧
      </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold mb-4">
        Coming <span className="text-[#FF6A00]">Soon</span>
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md mb-10 leading-relaxed">
        We're working hard to bring you this page. Please check back later or
        explore other features of Graxion!
      </p>
      <button
        onClick={() => navigate("/")}
        className="px-8 py-3.5 bg-gradient-to-r from-[#FF6A00] to-[#e05d00] text-white font-bold rounded-xl shadow-[0_0_20px_rgba(255,106,0,0.3)] hover:scale-105 hover:shadow-[0_0_30px_rgba(255,106,0,0.5)] transition-all duration-300 text-base"
      >
        ← Back to Home
      </button>
    </div>
  );
}
