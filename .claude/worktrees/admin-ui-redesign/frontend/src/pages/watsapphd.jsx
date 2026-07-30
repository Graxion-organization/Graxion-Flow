// Simple JSX Version (No Hooks, Direct Use)

export default function WhatsAppSignup() {
  let latestCode = null; // store code

  // Load SDK once
  if (!window.fbLoaded) {
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    document.body.appendChild(script);

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: "928669669524481",
        autoLogAppEvents: true,
        xfbml: true,
        version: "v25.0",
      });
    };

    window.fbLoaded = true;

    // Message Listener
    window.addEventListener("message", (event) => {
      if (!event.origin.includes("facebook.com")) return;

      try {
        let data;

        if (typeof event.data === "string" && event.data.startsWith("{")) {
          data = JSON.parse(event.data);
        } else {
          console.log("Non-JSON Event (ignore):", event.data);
          return;
        }

        if (data.type === "WA_EMBEDDED_SIGNUP") {
          console.log("✅ Signup Data:", data);
        }
      } catch (err) {
        console.log("❌ Parse Error:", event.data);
      }
    });
  }

  // Callback
  const fbLoginCallback = (response) => {
    if (response.authResponse) {
      const code = response.authResponse.code;
      latestCode = code;
      window.latestCode = code; // global for button use
      console.log("Auth Code:", code);
    } else {
      console.log("Login Failed:", response);
    }
  };

  // Launch Signup
  const launchWhatsAppSignup = () => {
    window.FB.login(fbLoginCallback, {
      config_id: "789393257580981",

      response_type: "code",
      override_default_response_type: true,
      extras: { setup: {} },
    });
  };

  // 🔥 Exchange Code → Access Token
  const getAccessToken = async () => {
    const code = window.latestCode;

    if (!code) {
      alert("Pehle signup complete karo!");
      return;
    }

    try {
      const params = new URLSearchParams({
        client_id: "928669669524481",
        client_secret: "3f2ca6332fae1b92579402e3fc3b0c54",
        code: code,
      });

      const res = await fetch(
        `https://graph.facebook.com/v25.0/oauth/access_token?${params.toString()}`,
      );

      const data = await res.json();
      console.log("🔥 Access Token Response:", data);
    } catch (err) {
      console.log("❌ Token Error:", err);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>WhatsApp Signup</h2>

      <button
        onClick={launchWhatsAppSignup}
        style={{
          backgroundColor: "#1877f2",
          color: "white", 
          padding: "10px 20px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
          marginRight: "10px",
        }}
      >
        Login with Facebook
      </button>

      {/* NEW BUTTON */}
      <button
        onClick={getAccessToken}
        style={{
          backgroundColor: "green",
          color: "white",
          padding: "10px 20px",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer",
        }}
      >
        Get Access Token
      </button>
    </div>
  );
}
