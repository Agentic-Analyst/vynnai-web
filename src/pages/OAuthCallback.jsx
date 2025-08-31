// pages/OAuthCallback.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/lib/authApi";
import { Loader2 } from "lucide-react";

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Finalizing sign-in…");

  useEffect(() => {
    const { next, error } = authApi.parseOAuthCallback();

    if (error) {
      setMsg(`Sign-in error: ${error}`);
      return;
    }

    (async () => {
      try {
        // Ask backend if the HTTP-only session cookie is present & valid
        const me = await authApi.fetchSession(); // { authenticated, email }
        if (me?.authenticated) {
          // Optional: persist email locally if you want
          authApi.persistSession?.({ email: me.email });

          // Clean the URL (drop query/hash) before navigating
          window.history.replaceState({}, document.title, "/auth/callback");
          navigate(next || "/chat", { replace: true });
        } else {
          setMsg("No session cookie returned. Please try signing in again.");
        }
      } catch (e) {
        setMsg(`Could not complete sign-in: ${e.message}`);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="rounded-xl border bg-white p-6 shadow-sm text-slate-700">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{msg}</span>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
