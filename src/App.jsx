import React, { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import ChatPage from "./pages/ChatPage.tsx";
import StockDashboardLayout from "./pages/StockDashboardLayout.tsx";
import LandingPage from "./pages/LandingPage.jsx";
import OAuthCallback from "./pages/OAuthCallback.jsx";
import { NewsWebSocketProvider } from "./contexts/NewsWebSocketContext.tsx";
import { StockPricesWebSocketProvider } from "./contexts/StockPricesWebSocketContext.tsx";
import { HistoricalDataProvider } from "./contexts/HistoricalDataContext.tsx";
import { DailyReportsProvider } from "./contexts/DailyReportsContext.tsx";

// Stock Dashboard Pages
import Stocks from "./pages/Stocks.tsx";
import { NewsPage } from "./pages/NewsPage.tsx";
import Markets from "./pages/Markets.tsx";
import Currencies from "./pages/Currencies.tsx";
import Global from "./pages/Global.tsx";
import Portfolio from "./pages/Portfolio.tsx";
import PortfolioList from "./pages/PortfolioList.tsx";
import Performance from "./pages/Performance.tsx";
import Analysis from "./pages/Analysis.tsx";
import Settings from "./pages/Settings.tsx";
import Reports from "./pages/Reports.tsx";
import Navigation from "./components/Navigation.jsx";
import { NewsWebSocketTest } from "./components/test/NewsWebSocketTest.tsx";
import { API_BASE_URL } from "@/lib/apiBase";

const queryClient = new QueryClient();
const AUTH_CHECK_URL = `${API_BASE_URL}/auth/session/me`; // 200 if cookie valid, 401 otherwise
const FRONT_SESSION_KEY = "client_session"; // ephemeral per-tab flag

const Shell = ({ children }) => {
  const loc = useLocation();
  const hideNav = loc.pathname.startsWith("/auth/callback");

  const [isAuthed, setIsAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkAuth = React.useCallback(async () => {
    try {
      const res = await fetch(AUTH_CHECK_URL, {
        method: "GET",
        credentials: "include",
      });
      const hasFront = sessionStorage.getItem(FRONT_SESSION_KEY) === "1";
      // require BOTH: server cookie valid AND this tab's front flag
      setIsAuthed(res.ok && hasFront);
      if (!res.ok) {
        // optional: clean any stale token your app might have used earlier
        localStorage.removeItem("auth_token");
      }
    } catch {
      setIsAuthed(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const onStorage = (e) => {
      if (e.key === "auth_token") checkAuth();
    };
    const onFocus = () => checkAuth();
    const onVisibility = () => {
      if (document.visibilityState === "visible") checkAuth();
    };

    // NEW: re-check immediately when login flow finishes in the same tab
    const onAuthUpdated = () => checkAuth();

    const poll = setInterval(checkAuth, 5 * 60 * 1000);

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("authUpdated", onAuthUpdated); // <-- add

    return () => {
      clearInterval(poll);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("authUpdated", onAuthUpdated); // <-- add
    };
  }, [checkAuth]);

  if (checking && !isAuthed && !hideNav) return null;

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
              {(isAuthed) =>
                isAuthed ? (
                  <DailyReportsProvider>
                    <NewsWebSocketProvider>
                      <StockPricesWebSocketProvider>
                        <HistoricalDataProvider>
                          <Routes>
                          <Route
                            path="/"
                            element={<Navigate to="/chat" replace />}
                          />
                          <Route path="/chat" element={<ChatPage />} />
                          <Route path="/analyst" element={<ChatPage />} />

                          {/* Stock Dashboard Routes */}
                          <Route
                            path="/dashboard/*"
                            element={<StockDashboardLayout />}
                          >
                            <Route
                              index
                              element={
                                <Navigate to="/dashboard/news" replace />
                              }
                            />
                            <Route path="news" element={<NewsPage />} />
                            <Route path="stocks" element={<Stocks />} />
                            <Route path="markets" element={<Markets />} />
                            <Route path="currencies" element={<Currencies />} />
                            <Route path="global" element={<Global />} />
                            <Route path="reports" element={<Reports />} />
                            <Route
                              path="portfolio"
                              element={<PortfolioList />}
                            />
                            <Route
                              path="portfolio/:portfolioId"
                              element={<Portfolio />}
                            />
                            <Route
                              path="performance"
                              element={<Performance />}
                            />
                            <Route path="analysis" element={<Analysis />} />
                            <Route path="settings" element={<Settings />} />
                            <Route
                              path="test/news-websocket"
                              element={<NewsWebSocketTest />}
                            />
                          </Route>

                          {/* OAuth finishes here */}
                          <Route
                            path="/auth/callback"
                            element={<OAuthCallback />}
                          />

                          {/* Fallback */}
                          <Route
                            path="*"
                            element={<Navigate to="/" replace />}
                          />
                        </Routes>
                      </HistoricalDataProvider>
                    </StockPricesWebSocketProvider>
                  </NewsWebSocketProvider>
                </DailyReportsProvider>
                ) : (
                  <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/auth/callback" element={<OAuthCallback />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                )
              }
            </Shell>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
