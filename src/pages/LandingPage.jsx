// pages/LandingPage.jsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/authApi';
import { Github, Mail, ArrowRight } from "lucide-react";

const GoogleIcon = (props) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
    <path fill="#EA4335" d="M12 11.999v4.8h6.844A6.997 6.997 0 0 0 19 12c0-.7-.114-1.373-.324-2H12z"/>
    <path fill="#34A853" d="M12 19.2c3.06 0 5.624-1.02 7.499-2.76L13.8 12H12v7.2z"/>
    <path fill="#4285F4" d="M19.5 16.44A7.992 7.992 0 0 0 20 12c0-.69-.09-1.36-.26-2H12v4.2l7.5 2.24z"/>
    <path fill="#FBBC04" d="M4.98 14.09A7.988 7.988 0 0 1 4 12c0-.71.11-1.39.31-2.02L8.9 12l-3.92 2.09z"/>
    <path fill="#EA4335" d="M12 4.8c1.67 0 3.18.57 4.37 1.52l2.93-2.93C17.63 2.17 14.99 1 12 1 7.58 1 3.83 3.58 1.98 7.09L6.9 9.2C7.68 6.72 9.65 4.8 12 4.8z"/>
  </svg>
);

const LandingPage = () => {
  // email-code login state
  const [step, setStep] = useState(1); // 1=email, 2=code
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();
  const FRONT_SESSION_KEY = 'client_session';

  const startCooldown = (sec = 30) => {
    setCooldown(sec);
    const iv = setInterval(() => {
      setCooldown(s => {
        if (s <= 1) { clearInterval(iv); return 0; }
        return s - 1;
      });
    }, 1000);
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    setSending(true);
    try {
      await authApi.requestCode(email.trim());
      setStep(2);
      startCooldown(30);
    } catch (err) {
      setError(err.message || 'Could not send code.');
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) { setError('Please enter the verification code.'); return; }
    setSending(true);
    try {
      const res = await authApi.verifyCode(email.trim(), code.trim());
      console.log(res);
      authApi.persistSession({ token: res.token, email: res.email });
      sessionStorage.setItem(FRONT_SESSION_KEY, '1');       // <-- add this
      window.dispatchEvent(new Event('authUpdated'));       // <-- notify other tabs (optional)
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setSending(false);
    }
  };

  const startGoogle = () => authApi.startOAuth('google', '/chat');
  const startGitHub = () => authApi.startOAuth('github', '/chat');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 sm:p-8 text-white shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-semibold">Welcome to Financial AI Agent</h1>
          <p className="text-sm opacity-80 mt-1">Log in to continue</p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            onClick={startGoogle}
            className="w-full justify-center gap-2 bg-white text-slate-900 hover:bg-slate-100"
            variant="secondary"
          >
            <GoogleIcon className="h-4 w-4" />
            Continue with Google
          </Button>

          <Button
            type="button"
            onClick={startGitHub}
            className="w-full justify-center gap-2 bg-slate-900 hover:bg-black"
          >
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>
        </div>

        <div className="relative my-6">
          <div className="border-t border-white/10" />
          <span className="absolute inset-x-0 -top-3 text-center">
            <span className="bg-slate-900 px-3 text-xs uppercase tracking-wide text-white/60">or</span>
          </span>
        </div>

        {/* Email-code flow (optional) */}
        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-3">
            <div className="flex items-center gap-2 text-white/80 text-sm">
              <Mail className="h-4 w-4" />
              <span>Login via one-time code</span>
            </div>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-black bg-white"
              disabled={sending}
              required
            />
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send verification code'}
            </Button>
            {error && <div className="text-red-300 text-sm">{error}</div>}
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-3">
            <div className="text-sm text-white/80">We sent a code to <strong>{email}</strong>.</div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-black bg-white"
              disabled={sending}
              required
            />
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              disabled={sending}
            >
              {sending ? 'Verifying...' : <>Verify & Continue <ArrowRight className="ml-1 h-4 w-4" /></>}
            </Button>

            <div className="flex justify-between items-center text-sm mt-1">
              <button
                type="button"
                className="underline disabled:opacity-50"
                disabled={cooldown > 0 || sending}
                onClick={handleRequestCode}
              >
                Resend code {cooldown > 0 ? `(${cooldown})` : ''}
              </button>
              <button type="button" className="underline" onClick={() => setStep(1)}>Use a different email</button>
            </div>
            {error && <div className="text-red-300 text-sm">{error}</div>}
          </form>
        )}

        <p className="mt-6 text-center text-[11px] text-white/60">
          By continuing you agree to our Terms and acknowledge our Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
