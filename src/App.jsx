// App.jsx
import React, { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ChatPage from "./pages/ChatPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import OAuthCallback from "./pages/OAuthCallback.jsx";
import Navigation from "./components/Navigation.jsx";

const queryClient = new QueryClient();

const Shell = ({ children }) => {
  // Hide top nav on the callback screen
  const loc = useLocation();
  const hideNav = loc.pathname.startsWith('/auth/callback');

  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const tok = localStorage.getItem('auth_token');
      setIsAuthed(!!tok);
    };
    checkAuth();
    const onStorage = (e) => { if (e.key === 'auth_token') checkAuth(); };
    const onAuthUpdated = () => checkAuth();

    window.addEventListener('storage', onStorage);
    window.addEventListener('authUpdated', onAuthUpdated);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('authUpdated', onAuthUpdated);
    };
  }, []);

  return (
    <>
      {!hideNav && isAuthed && <Navigation />}
      {children(isAuthed)}
    </>
  );
};

const App = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Shell>
              {(isAuthed) => (
                <Routes>
                  <Route path="/" element={isAuthed ? <Navigate to="/chat" replace /> : <LandingPage />} />
                  <Route path="/chat" element={isAuthed ? <ChatPage /> : <Navigate to="/" replace />} />
                  <Route path="/dashboard" element={isAuthed ? <DashboardPage /> : <Navigate to="/" replace />} />
                  <Route path="/analyst" element={isAuthed ? <ChatPage /> : <Navigate to="/" replace />} />

                  {/* OAuth finishes here */}
                  <Route path="/auth/callback" element={<OAuthCallback />} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              )}
            </Shell>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
