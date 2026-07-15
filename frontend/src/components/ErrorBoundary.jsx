import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#04060C",
            color: "#F1F5F9",
            fontFamily: "Manrope, system-ui, sans-serif",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <div>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
              Something went wrong
            </h1>
            <p style={{ opacity: 0.8, marginBottom: "1rem" }}>
              Please refresh the page. If this keeps happening, contact support.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.06)",
                color: "#F1F5F9",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
