import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex items-center justify-center bg-[#060a0f] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,211,102,0.1),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(37,211,102,0.08),transparent_60%)]" />

      <div className="relative text-center p-10 rounded-2xl bg-white/5 backdrop-blur-lg border border-[#25D36633] shadow-[0_0_40px_rgba(37,211,102,0.15)]">
        {/* 404 Text */}
        <h1 className="text-[120px] font-bold text-[#25D366] drop-shadow-[0_0_25px_rgba(37,211,102,0.6)]">
          404
        </h1>

        <h2 className="text-2xl font-semibold mt-2">Oops! Page Not Found</h2>

        <p className="text-gray-400 mt-3 mb-6">
          The page you are looking for doesn’t exist or has been moved.
        </p>

        {/* Button */}
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-gradient-to-r from-[#25D366] to-[#1aab52] text-[#060a0f] font-semibold rounded-lg 
          shadow-[0_0_20px_rgba(37,211,102,0.5)] 
          hover:scale-105 hover:shadow-[0_0_40px_rgba(37,211,102,0.8)] 
          transition duration-300"
        >
          Go Back Home →
        </button>
      </div>
    </div>
  );
};

export default NotFound;
