import { useEffect } from "react";
import { whatsappAPI } from "../services/api";

export default function Callback() {
  useEffect(() => {
    const handleSignup = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (!code) return;

      try {
        const redirectUri = window.location.origin + "/callback";
        const res = await whatsappAPI.embeddedSignupCallback(code, redirectUri);

        localStorage.setItem("wa_data", JSON.stringify(res.data.data));

        window.location.href = "/app/integrations";
      } catch (err) {
        console.error(err);
        alert("Signup failed: " + (err.response?.data?.message || err.message));
        window.location.href = "/app/integrations";
      }
    };

    handleSignup();
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <h1>Connecting WhatsApp... Please wait.</h1>
    </div>
  );
}
