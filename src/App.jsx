import React, { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatPage from "./pages/ChatPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Navigation from "./components/Navigation.jsx";

const queryClient = new QueryClient();

const App = () => {
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkApiKey = () => {
      const storedApiKey = localStorage.getItem('openai_api_key');
      setHasApiKey(!!storedApiKey);
    };

    // Check on initial load
    checkApiKey();

    // Listen for storage changes (when API key is set)
    const handleStorageChange = (e) => {
      if (e.key === 'openai_api_key') {
        checkApiKey();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (for same-tab updates)
    const handleApiKeyUpdate = () => {
      checkApiKey();
    };

    window.addEventListener('apiKeyUpdated', handleApiKeyUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('apiKeyUpdated', handleApiKeyUpdate);
    };
  }, []);

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            {hasApiKey && <Navigation />}
            <Routes>
              <Route path="/" element={hasApiKey ? <Navigate to="/chat" replace /> : <LandingPage />} />
              <Route path="/chat" element={hasApiKey ? <ChatPage /> : <Navigate to="/" replace />} />
              <Route path="/dashboard" element={hasApiKey ? <DashboardPage /> : <Navigate to="/" replace />} />
              {/* Legacy routes for backward compatibility */}
              <Route path="/analyst" element={hasApiKey ? <ChatPage /> : <Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;