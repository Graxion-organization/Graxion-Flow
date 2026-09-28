import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    // If it's a chunk load error or syntax error from stale assets, attempt auto-refresh once
    const isChunkError = 
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      (error?.message?.includes('Unexpected token') && error?.message?.includes('<'));

    if (isChunkError && !sessionStorage.getItem('chunk_error_reloaded')) {
      sessionStorage.setItem('chunk_error_reloaded', 'true');
      window.location.reload();
    }
  }

  handleReload = () => {
    sessionStorage.removeItem('chunk_error_reloaded');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#060912] text-slate-100 font-sans p-6 text-center">
          <div className="max-w-md w-full p-8 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#FF6A00]/15 text-[#FF6A00] flex items-center justify-center font-bold text-2xl">
              !
            </div>
            <h1 className="text-xl font-bold mb-2 text-white">
              Application Update Available
            </h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              A newer version of Graxion Flow or updated assets were detected. Please reload to continue smoothly.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF6A00] to-[#FF4500] text-white font-semibold text-sm shadow-lg shadow-[#FF6A00]/25 hover:opacity-95 transition-all"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/app/dashboard';
                }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-medium text-sm transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

