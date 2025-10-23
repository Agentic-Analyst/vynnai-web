// pages/LandingPage.jsx
import React, { useState, useEffect, useRef } from 'react';
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

  // Interactive background effect
  const canvasRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Stock ticker symbols for particles
    const symbols = ['$', '↗', '↘', '₿', '€', '¥', '£', '📈', '📊', '💹', '∞', '◆', '●'];
    
    // Create floating particles
    class Particle {
      constructor() {
        this.reset();
        this.y = Math.random() * canvas.height;
        this.opacity = Math.random() * 0.5 + 0.1;
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = -20;
        this.speed = Math.random() * 0.5 + 0.2;
        this.size = Math.random() * 20 + 10;
        this.symbol = symbols[Math.floor(Math.random() * symbols.length)];
        this.drift = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.3 + 0.1;
      }

      update() {
        this.y += this.speed;
        this.x += this.drift;
        
        // Magnetic effect towards cursor
        const dx = mousePos.current.x - this.x;
        const dy = mousePos.current.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 200) {
          const force = (200 - distance) / 200;
          this.x += (dx / distance) * force * 2;
          this.y += (dy / distance) * force * 2;
          this.opacity = Math.min(0.8, this.opacity + force * 0.3);
        } else {
          this.opacity = Math.max(0.1, this.opacity - 0.01);
        }

        if (this.y > canvas.height + 20 || this.x < -20 || this.x > canvas.width + 20) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.font = `${this.size}px Arial`;
        ctx.fillStyle = `rgba(96, 165, 250, ${this.opacity})`;
        ctx.fillText(this.symbol, this.x, this.y);
        ctx.restore();
      }
    }

    // Initialize particles
    for (let i = 0; i < 50; i++) {
      particles.current.push(new Particle());
    }

    // Mouse connection lines
    const drawConnections = () => {
      particles.current.forEach((particle, i) => {
        particles.current.slice(i + 1).forEach((otherParticle) => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(59, 130, 246, ${(1 - distance / 150) * 0.2})`;
            ctx.lineWidth = 1;
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });

        // Connect to mouse
        const dx = particle.x - mousePos.current.x;
        const dy = particle.y - mousePos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 150) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(96, 165, 250, ${(1 - distance / 150) * 0.4})`;
          ctx.lineWidth = 2;
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(mousePos.current.x, mousePos.current.y);
          ctx.stroke();
        }
      });
    };

    // Glow effect at cursor
    const drawCursorGlow = () => {
      const gradient = ctx.createRadialGradient(
        mousePos.current.x, mousePos.current.y, 0,
        mousePos.current.x, mousePos.current.y, 100
      );
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawCursorGlow();
      drawConnections();
      
      particles.current.forEach(particle => {
        particle.update();
        particle.draw();
      });

      requestAnimationFrame(animate);
    };

    animate();

    // Event listeners
    const handleMouseMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 relative overflow-hidden">
      {/* Interactive Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white/5 backdrop-blur border border-white/10 p-6 sm:p-8 text-white shadow-2xl relative" style={{ zIndex: 1 }}>
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent mb-4">
            Welcome to VYNN AI Agent
          </h1>
          
          <div className="space-y-3 text-slate-300 leading-relaxed">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-200 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
              BETA ACCESS
            </div>
            
            <p className="text-sm">
              As we are still in development, VYNN AI agent is only publicly available for a limited number of users.
            </p>
            
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 space-y-2">
              <p className="text-sm font-medium text-slate-200">To request access:</p>
              <p className="text-sm">
                Send a request to 
                <span className="mx-1 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded text-blue-300 font-mono text-xs">
                  zanwen.fu@duke.edu
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Then login using your email and the verification code I send you.
              </p>
            </div>
          </div>
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
