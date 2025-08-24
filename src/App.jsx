import React, { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ChatPage from "./pages/ChatPage";
import DashboardPage from "./pages/DashboardPage";
import LandingPage from "./pages/LandingPage";
import Navigation from "./components/Navigation";

const queryClient = new QueryClient();

const App = () => {
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem('openai_api_key');
    setHasApiKey(!!storedApiKey);
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
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;