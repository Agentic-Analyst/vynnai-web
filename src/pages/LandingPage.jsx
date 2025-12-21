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
        ctx.font = `${this.size}px "Times New Roman", serif`; // Serif for luxury
        ctx.fillStyle = `rgba(217, 119, 6, ${this.opacity})`; // Amber-600
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
            ctx.strokeStyle = `rgba(245, 158, 11, ${(1 - distance / 150) * 0.2})`; // Amber-500
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
          ctx.strokeStyle = `rgba(251, 191, 36, ${(1 - distance / 150) * 0.4})`; // Amber-400
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
      gradient.addColorStop(0, 'rgba(245, 158, 11, 0.15)'); // Amber glow
      gradient.addColorStop(1, 'rgba(245, 158, 11, 0)');
      
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-slate-100 to-amber-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 relative overflow-hidden transition-colors duration-300">
      {/* Interactive Canvas Background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-amber-400/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-orange-400/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute -bottom-[10%] left-[20%] w-[60%] h-[60%] bg-amber-300/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full max-w-md rounded-2xl bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border border-white/20 dark:border-slate-800 p-8 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-none relative" style={{ zIndex: 1 }}>
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 dark:from-amber-200 dark:via-amber-400 dark:to-amber-200 bg-clip-text text-transparent mb-4 tracking-tight">
            VYNN AI
          </h1>
          <p className="text-muted-foreground text-sm uppercase tracking-widest mb-6 font-medium">
            Financial Intelligence
          </p>
          
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-200 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse"></span>
              EXCLUSIVE ACCESS
            </div>
            
            <p className="text-sm font-light">
              Experience the future of financial analysis. Access is currently limited to invited members only.
            </p>
            
            <div className="bg-amber-50/80 dark:bg-amber-950/30 rounded-xl p-5 border border-amber-200/60 dark:border-amber-800/50 space-y-3 shadow-sm">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Request Invitation</p>
              <div className="text-sm text-slate-600 dark:text-slate-300">
                Contact the owner at
                <div className="mt-2 flex flex-col gap-2">
                  <a 
                    href="mailto:zanwen.fu@duke.edu" 
                    className="flex items-center justify-center px-3 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-md text-amber-700 dark:text-amber-400 font-mono text-xs hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all shadow-sm hover:shadow"
                  >
                    <Mail className="w-3 h-3 mr-2" />
                    zanwen.fu@duke.edu
                  </a>
                  <a 
                    href="https://www.linkedin.com/in/zanwenfu/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center px-3 py-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-md text-amber-700 dark:text-amber-400 font-mono text-xs hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all shadow-sm hover:shadow"
                  >
                    <span className="mr-2 font-sans font-bold text-[10px] border border-current rounded px-0.5">in</span>
                    linkedin.com/in/zanwenfu
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            onClick={startGoogle}
            className="w-full justify-center gap-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium transition-all duration-300 shadow-sm h-11"
            variant="ghost"
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </Button>

          <Button
            type="button"
            onClick={startGitHub}
            className="w-full justify-center gap-2 bg-[#24292F] text-white border border-transparent hover:bg-[#24292F]/90 transition-all duration-300 shadow-sm h-11"
          >
            <Github className="h-5 w-5" />
            Continue with GitHub
          </Button>
        </div>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-950 px-2 text-slate-500 dark:text-slate-400">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email-code flow (optional) */}
        {step === 1 ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 h-11 focus-visible:ring-amber-500/20 focus-visible:border-amber-500/50"
                disabled={sending}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md shadow-amber-500/20 h-11 font-medium"
              disabled={sending}
            >
              {sending ? 'Sending code...' : 'Send verification code'}
            </Button>
            {error && <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30">{error}</div>}
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <div className="text-sm text-slate-600 dark:text-slate-400 text-center">
              We sent a code to <span className="font-medium text-slate-900 dark:text-slate-200">{email}</span>
            </div>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 h-11 text-center tracking-widest text-lg"
              disabled={sending}
              required
            />
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md shadow-amber-500/20 h-11 font-medium"
              disabled={sending}
            >
              {sending ? 'Verifying...' : <span className="flex items-center gap-2">Verify & Continue <ArrowRight className="h-4 w-4" /></span>}
            </Button>

            <div className="flex justify-between items-center text-xs mt-2 text-slate-500 dark:text-slate-400">
              <button
                type="button"
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors disabled:opacity-50"
                disabled={cooldown > 0 || sending}
                onClick={handleRequestCode}
              >
                Resend code {cooldown > 0 ? `(${cooldown}s)` : ''}
              </button>
              <button type="button" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors" onClick={() => setStep(1)}>Change email</button>
            </div>
            {error && <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900/30">{error}</div>}
          </form>
        )}

        <p className="mt-8 text-center text-[11px] text-slate-400 dark:text-slate-500">
          By continuing you agree to our <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-300">Terms</a> and acknowledge our <a href="#" className="underline hover:text-slate-600 dark:hover:text-slate-300">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
