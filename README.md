<div align="center">

<img src="assets/vynnai-logo.jpg" alt="VYNN AI logo" width="200">

# VYNN AI — Intelligent Financial Analysis Platform

**A production-grade, real-time financial intelligence platform combining conversational AI with institutional-quality market analysis, live data streaming, and portfolio management.**

[![React 18](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Proprietary-amber)](#copyright--ownership)

[Live Demo](https://app.vynnai.com) · [Architecture](#architecture-overview) · [Quick Start](#quick-start) · [Features](#features)

</div>

---

## Codebase Statistics

| Category | Lines | Files |
|----------|------:|------:|
| TypeScript JSX (`.tsx`) | 14,308 | 56 |
| TypeScript (`.ts`) | 4,241 | 22 |
| JavaScript JSX (`.jsx`) | 3,551 | 52 |
| JavaScript (`.js`) | 903 | 13 |
| CSS (`.css`) | 150 | 1 |
| HTML (`.html`) | 15 | 1 |
| **Total (source code)** | **~23,168** | **145** |
| Config / metadata (`.json`) | 9,865 | 6 |
| Documentation (`.md`) | 699 | 3 |
| **Grand Total** | **33,732** | **154** |

> *Auto-generated files like `package-lock.json` (9,695 lines) are included in the JSON count. Hand-written source code totals ~23,168 lines.*

---

## Overview

VYNN AI is a full-stack financial intelligence SPA that unifies **AI-powered conversational analysis**, **real-time WebSocket market data**, **portfolio management**, **automated report generation**, and a **market news aggregation** system into a cohesive, premium interface.

The platform is designed as a dual-experience application:

| Experience | Description |
|---|---|
| **AI Chat Interface** | A ChatGPT-style conversational UI that orchestrates backend analysis jobs via SSE streaming, producing downloadable financial models (`.xlsx`), professional analyst reports (`.pdf`), and real-time progress visualization. |
| **Market Dashboard** | A multi-page financial dashboard with live stock prices, news feeds, portfolio tracking with real-time P&L, performance analytics with exportable charts, and AI-generated daily reports. |

---

## Features

### 🤖 AI-Powered Chat & Analysis Engine

- **Conversational AI Interface** — Multi-conversation management with persistent history, inline rename/delete, search, and reorder by recency
- **Server-Sent Events (SSE) Streaming** — Real-time job progress with log batching, natural-language summary extraction, and dual-report capture (deterministic financial models + LLM-generated analyst reports)
- **Downloadable Artifacts** — Financial models (`.xlsx`), professional analyst reports (`.pdf`), financial summaries, and news digests generated per analysis job
- **Virtualized Message List** — `react-window` with dynamic row height measurement for smooth rendering of long conversations
- **Rich Markdown Rendering** — Full GFM support with syntax-highlighted code blocks (`react-syntax-highlighter`), tables, blockquotes, and theme-aware styling
- **Typewriter Greeting Animation** — Branded welcome experience with character-by-character text reveal
- **Connection Resilience** — Module-scoped singleton SSE refs survive React unmounts; periodic status polling as fallback; visibility-change reconnection

### 📊 Real-Time Market Dashboard

- **Live Stock Prices** — Persistent WebSocket connection with subscriber-based architecture; multiple components share a single connection with independent symbol subscriptions
- **Stock Watchlist** — Add/remove tickers with real-time price, change %, volume, market cap, 52-week range, P/E ratio, dividend yield, bid/ask spread
- **Interactive Stock Charts** — Historical OHLCV data with time range selectors (1D → All), real-data-first with mock fallback, gradient area fills via Recharts
- **Sparkline Visualizations** — Inline mini-charts embedded in stock cards for at-a-glance trend indication
- **Market Stats Aggregation** — Computed total market cap, trading volume, top gainer/loser, and trend indicators derived from watchlist data
- **Market Status Engine** — Real-time open/closed/pre-market/after-hours detection with countdown timers, US holiday awareness (NYSE/NASDAQ calendar with algorithmic holiday computation including Easter), and ET timezone conversion

### 📰 Real-Time News Aggregation

- **WebSocket News Streaming** — Persistent connection with ticker-based subscriptions, article deduplication (by ID, URL hash, or URL), and newest-first sorting
- **Advanced Filtering** — Search by keyword, filter by ticker symbol, filter by source, with paginated results (20 per page)
- **Market Alert System** — Critical/warning/info alert classification with affected-symbol tagging, auto-popup dialogs for high-impact alerts, and a persistent global alert banner
- **Demo Mode** — Auto-generating alert simulation with sequential rotation through realistic market events

### 💼 Portfolio Management

- **Multi-Portfolio System** — Full CRUD for unlimited portfolios, each with independent holdings, search, sort (7 fields), and navigation
- **Holdings Management** — Add/edit/delete stock positions with symbol validation, share count, and cost basis tracking
- **Real-Time P&L** — WebSocket-powered live gain/loss calculation with connection status indicators (green pulse for live data)
- **Dual View Modes** — Toggle between detailed table view and visual card grid view
- **Stock Analysis Dialogs** — Per-holding short-term recommendation (Buy/Hold/Sell), intrinsic value estimation, and full markdown-rendered analysis previews
- **Delete Confirmation** — Destructive actions require explicit confirmation via AlertDialog

### 📈 Performance Analytics

- **6 Interactive Chart Types** — All built with Recharts:
  - **Portfolio Value Over Time** — AreaChart with cost basis overlay
  - **Allocation Breakdown** — PieChart by holding
  - **Gain/Loss by Holding** — BarChart with conditional green/red coloring
  - **Diversification Analysis** — RadarChart computing Herfindahl concentration index, balance, and spread scores
  - **Risk/Return Profile** — ScatterChart plotting each holding's risk vs. return
  - **Allocation Treemap** — Weighted visual representation with custom content renderer
- **Chart Export** — One-click PNG export via `html-to-image` for any chart
- **Portfolio Selector** — Switch between portfolios with a dropdown

### 📄 AI-Generated Daily Reports

- **Three Report Categories** — Company Reports, Sector Reports, and Global Market Reports via tabbed interface
- **Smart Report Generation** — Detects missing reports for the current date, triggers backend batch jobs, and polls status every 12 seconds
- **Batch Polling with Persistence** — Generation state survives page navigation via localStorage; stale generation detection (>5 min auto-cleanup)
- **Report Preview** — Multi-format viewer supporting Markdown (with rich custom styling) and PDF (iframe) rendering
- **PDF Download** — Direct blob download with auto-generated filenames
- **Watchlist Integration** — Reports auto-generated for stocks in the user's watchlist
- **Market Date Awareness** — Calculates the correct market date in ET timezone (falls back to previous trading day before 8:30 AM ET)

### 💱 Additional Modules

- **Currency Exchange** — Currency pair rates with change indicators and a converter tool
- **Global Markets** — Regional market overview (Americas, Europe, Asia-Pacific), economic calendar, risk assessment gauges, market cap distribution, and technical indicators (RSI, MACD, signals)
- **Crypto Analysis** — Top cryptocurrency cards, 30-day price history charts, stock growth treemap, and ranked crypto table

### 🔐 Authentication & Security

- **Multi-Provider OAuth** — Google and GitHub OAuth via full-page redirect (ensures HTTP-only cookie is set correctly)
- **Email + Code Login** — Passwordless email verification with cooldown timer
- **Session Management** — HTTP-only cookie validation with periodic polling (5-min interval), cross-tab sync via `storage` events, and visibility-change re-checks
- **User-Scoped Storage** — `userStorage` utility namespaces all localStorage keys by authenticated email to prevent data leakage between accounts

### 🎨 Design System & UX

- **Luxury Dark Theme** — Default dark mode with amber/gold accent palette, glass-morphism effects (`backdrop-blur`, semi-transparent surfaces), and serif branding typography
- **Light Theme** — Full light mode support with CSS custom property theming
- **shadcn/ui Component Library** — 40+ Radix UI-based components (Dialog, Sheet, Tabs, Accordion, Popover, Command, etc.) with consistent design tokens
- **Responsive Layout** — Collapsible sidebar, mobile-aware breakpoints, and fluid grid layouts
- **Staggered Animations** — CSS custom property-driven entrance animations (`animate-fade-in`, `animate-slide-up`) with configurable delays
- **Error Boundaries** — Class-based error boundaries with fallback UI and reload capability

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        VYNN AI Frontend                         │
│                     React 18 + TypeScript + Vite                │
├──────────────────┬──────────────────┬───────────────────────────┤
│   AI Chat (SSE)  │  Market Dashboard │    Portfolio Management  │
│                  │                  │                           │
│ • Multi-convo    │ • Real-time news │ • Multi-portfolio CRUD    │
│ • Job streaming  │ • Live prices    │ • Holdings management     │
│ • Log batching   │ • Stock charts   │ • Real-time P&L           │
│ • Report capture │ • Market alerts  │ • Performance analytics   │
│ • File downloads │ • Daily reports  │ • Chart export            │
├──────────────────┴──────────────────┴───────────────────────────┤
│                      Shared Infrastructure                      │
│                                                                 │
│  Context Providers    Custom Hooks        API Clients           │
│  ├─ NewsWebSocket     ├─ useMarketStatus  ├─ api.js (jobs/SSE)  │
│  ├─ StockPricesWS     ├─ usePortfolio     ├─ authApi.js (OAuth) │
│  ├─ HistoricalData    ├─ usePortfolios    ├─ dailyReportsApi.ts │
│  ├─ DailyReports      ├─ useStockWatchlist├─ settingsApi.ts     │
│  └─ GlobalAlerts      ├─ useRealTimeNews  └─ stocksApi.ts       │
│                       └─ useRealTimeStockPrices                  │
├─────────────────────────────────────────────────────────────────┤
│                     WebSocket Connections                        │
│  ┌─────────────────┐         ┌──────────────────────┐           │
│  │  News Stream     │         │  Stock Prices Stream  │          │
│  │  /api/news/ws    │         │  /api/realtime/ws     │          │
│  │  • Health check  │         │  • Subscriber-based   │          │
│  │  • Ticker subs   │         │  • Debounced subs     │          │
│  │  • Dedup by ID   │         │  • Delayed unsub      │          │
│  │  • Ping/pong     │         │  • Auto-reconnect     │          │
│  └─────────────────┘         └──────────────────────┘           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS / WSS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend API (FastAPI)                        │
│               https://api.vynnai.com                            │
│                                                                 │
│  /auth/*          OAuth + email-code login, session cookies      │
│  /chat            Create analysis jobs                          │
│  /jobs/*          Job status, logs (SSE), stop, outputs         │
│  /api/news/*      WebSocket news streaming + health             │
│  /api/realtime/*  WebSocket stock prices + health               │
│  /api/stocks/*    Historical OHLCV data                         │
│  /api/daily-reports/*  Report generation, retrieval, PDF        │
└─────────────────────────────────────────────────────────────────┘
```

### State Management Strategy

| Concern | Approach |
|---|---|
| **Server State** | TanStack React Query (`@tanstack/react-query`) for API data caching and invalidation |
| **Real-Time Data** | React Context providers wrapping persistent WebSocket connections |
| **Local UI State** | React `useState` / `useReducer` with `useMemo` for derived computations |
| **Persistent State** | `userStorage` — user-scoped localStorage wrapper with email-based namespacing |
| **Cross-Component Sync** | Context API + custom events (`authUpdated`, `storage` events) |

### WebSocket Architecture

The application maintains **two persistent WebSocket connections** at the app root:

1. **News WebSocket** (`NewsWebSocketContext`) — Singleton connection that intentionally never disconnects, surviving route changes. Supports ticker-based subscriptions with article deduplication and 30-second ping/pong keep-alive.

2. **Stock Prices WebSocket** (`StockPricesWebSocketContext`) — Subscriber-based architecture where multiple components register interest in different symbols. The context maintains a global union of all subscribed symbols, with debounced subscription updates (300ms) and delayed unsubscribe (1s) to handle React StrictMode double-mounts.

Both connections implement:
- Health check before initial connection
- Exponential backoff reconnection (up to 5 attempts, capped at 30s)
- Self-healing state correction on unexpected messages

### SSE Streaming Architecture (Chat)

The chat system uses **module-scoped singleton refs** for SSE connections that persist outside the React component lifecycle:

```
User Message → POST /chat → Job Created
                                  │
                    ┌─────────────┼─────────────────┐
                    ▼             ▼                  ▼
              SSE Stream    Status Polling      Log Buffer
              (primary)     (3s fallback)    (200 lines / 32KB)
                    │             │                  │
                    ▼             ▼                  ▼
              Event Router → State Updates → Virtualized UI
              (log, nl,       (progress,      (react-window)
               report,         completion)
               completed)
```

---

## Tech Stack

### Core

| Technology | Role |
|---|---|
| **React 18** | UI framework with hooks, Suspense-ready architecture |
| **TypeScript 5.9** | Type safety across components, hooks, contexts, and API clients |
| **Vite 5** | Build tooling with HMR, proxy configuration, and env variable injection |
| **React Router v6** | Client-side routing with nested layouts and protected routes |
| **TanStack React Query** | Server state management with caching and background refresh |

### UI & Design

| Technology | Role |
|---|---|
| **shadcn/ui** | 40+ accessible, composable UI primitives built on Radix UI |
| **Tailwind CSS 3.4** | Utility-first styling with custom design tokens and CSS variables |
| **Radix UI** | Headless, accessible component primitives (Dialog, Popover, Tabs, etc.) |
| **Lucide React** | Consistent icon system throughout the application |
| **Framer Motion** | Declarative animations for page transitions and micro-interactions |
| **tailwindcss-animate** | Extended animation utilities for entrance/exit transitions |

### Data Visualization

| Technology | Role |
|---|---|
| **Recharts** | 7 chart types: Area, Line, Bar, Pie, Radar, Scatter, Treemap |
| **html-to-image** | Client-side chart-to-PNG export |
| **react-window** | Virtualized rendering for long message lists |

### Content & Rendering

| Technology | Role |
|---|---|
| **react-markdown** | Markdown rendering with GFM and custom component overrides |
| **remark-gfm** | GitHub Flavored Markdown support (tables, strikethrough, task lists) |
| **remark-breaks** | Line break handling for streaming content |
| **react-syntax-highlighter** | Code block syntax highlighting with theme-aware styles |

### Communication

| Technology | Role |
|---|---|
| **WebSocket** | Dual persistent connections for news and stock price streaming |
| **Server-Sent Events** | One-way streaming for analysis job logs and progress |
| **Axios** | HTTP client for REST API calls with cookie credentials |
| **EventSource** | Native SSE client with named event handling |

### Forms & Validation

| Technology | Role |
|---|---|
| **React Hook Form** | Performant form management with controlled inputs |
| **Zod** | Schema-based validation for form data and API payloads |
| **@hookform/resolvers** | Zod-to-React-Hook-Form integration |

### Deployment

| Technology | Role |
|---|---|
| **Docker** | Multi-stage build (Node.js build → Nginx serve) |
| **Docker Compose** | Multi-service orchestration (frontend + API + volumes) |
| **Nginx** | Production static file serving |
| **Caddy** | Reverse proxy with automatic HTTPS (production) |

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 20.x
- **npm** ≥ 9.x (or [Bun](https://bun.sh/) — `bun.lockb` included)
- Backend API running at `http://localhost:8080` (for local development)

### Local Development

```bash
# Clone the repository
git clone https://github.com/fuzanwenn/gpt-web.git
cd gpt-web

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app starts at **http://localhost:5173** with API proxy configured to `http://localhost:8080`.

### Full Stack with Docker Compose

```bash
# Start all services (frontend + API backend)
docker compose -f docker-compose.dev.yml up

# Frontend: http://localhost:3000
# API:      http://localhost:8080
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_RUNNER_URL` | Backend API base URL (build-time) | `https://api.vynnai.com` |
| `VITE_API_BASE_URL` | Runtime API override | Falls back to `VITE_RUNNER_URL` |

---

## Project Structure

```
gpt-web/
├── public/                          # Static assets
├── src/
│   ├── main.jsx                     # React DOM entry point
│   ├── App.jsx                      # Root component — routing, auth, providers
│   ├── index.css                    # Tailwind base + CSS custom properties (light/dark themes)
│   │
│   ├── pages/                       # Route-level page components
│   │   ├── LandingPage.jsx          # Auth page — OAuth buttons, email-code login, animated particles
│   │   ├── OAuthCallback.jsx        # OAuth redirect handler — session validation
│   │   ├── StockDashboardLayout.tsx  # Dashboard shell — sidebar + outlet
│   │   │
│   │   ├── chat/
│   │   │   └── ChatPage.tsx         # AI chat — SSE streaming, multi-convo, virtualized list (~2000 LOC)
│   │   │
│   │   ├── NewsPage.tsx             # Real-time news — WebSocket feed, alerts, filtering (~1460 LOC)
│   │   ├── Reports.tsx              # Daily AI reports — generation, polling, preview, download (~1650 LOC)
│   │   ├── Stocks.tsx               # Stock watchlist — live prices, chart, market stats (~785 LOC)
│   │   ├── Portfolio.tsx            # Single portfolio — holdings CRUD, real-time P&L (~778 LOC)
│   │   ├── PortfolioList.tsx        # Portfolio management — search, sort, CRUD
│   │   ├── Performance.tsx          # Analytics — 6 chart types, PNG export (~792 LOC)
│   │   ├── Currencies.tsx           # Currency exchange rates + converter
│   │   ├── Global.tsx               # World markets, economic calendar, risk assessment
│   │   ├── Crypto.tsx               # Crypto market data + treemap
│   │   └── Settings.tsx             # User settings — account, notifications, security (~775 LOC)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx          # Collapsible nav sidebar — market status, live clock, navigation
│   │   │   ├── Navbar.tsx           # Top bar — brand, section indicator, search
│   │   │   ├── PageLayout.tsx       # Standard page shell (sidebar + content)
│   │   │   ├── IntegratedDashboard.tsx  # Market overview — merges real-time + mock data
│   │   │   └── Dashboard.tsx        # Redirect component → /dashboard/news
│   │   │
│   │   ├── stocks/
│   │   │   ├── StockCard.tsx        # Individual stock display — price, sparkline, recommendation
│   │   │   ├── StockChart.tsx       # Historical area chart — time ranges, live/cached data
│   │   │   └── Sparkline.tsx        # Minimal inline area chart (no axes/labels)
│   │   │
│   │   ├── portfolio/
│   │   │   ├── HoldingCard.tsx      # Single holding card — live P&L, recommendation badge
│   │   │   ├── HoldingModal.tsx     # Add/edit holding form — validation, dual-mode
│   │   │   ├── PortfolioModal.tsx   # Create/edit portfolio form — name, description
│   │   │   └── DeleteConfirmation.tsx  # Destructive action confirmation dialog
│   │   │
│   │   ├── markets/
│   │   │   ├── MarketOverview.tsx   # Regional market indices (US, Europe, Asia)
│   │   │   └── MarketStats.tsx      # Aggregated stats — market cap, volume, top movers
│   │   │
│   │   ├── news/
│   │   │   └── NewsCard.tsx         # News article list — images, symbols, sources
│   │   │
│   │   ├── currencies/
│   │   │   └── CurrencyExchange.tsx # Currency pair rates with change indicators
│   │   │
│   │   ├── reports/
│   │   │   └── ReportPreview.tsx    # Multi-format viewer — Markdown + PDF + placeholder
│   │   │
│   │   ├── Navigation.jsx          # Top-level nav (Chat ↔ Dashboard)
│   │   ├── GlobalAlertBanner.tsx    # Critical market alert banner + detail dialog
│   │   ├── ConnectionStatus.tsx     # WebSocket connection indicator (compact/full)
│   │   ├── ErrorBoundary.tsx        # Class-based error boundary with fallback UI
│   │   ├── PageHeader.tsx           # Reusable page header — breadcrumb, title, actions
│   │   ├── Breadcrumb.tsx           # Auto-generated breadcrumb from route config
│   │   ├── SectionIndicator.tsx     # Current page pill badge with icon
│   │   │
│   │   ├── ui/                      # 40+ shadcn/ui components (Radix UI-based)
│   │   │   ├── button.jsx, card.jsx, dialog.jsx, tabs.jsx, ...
│   │   │   ├── chart.tsx            # Recharts wrapper with theme integration
│   │   │   └── sonner.jsx           # Toast notification system
│   │   │
│   │   └── test/
│   │       ├── MarketStatusTest.tsx # Market status hook test harness
│   │       └── NewsWebSocketTest.tsx # WebSocket connection test harness
│   │
│   ├── features/
│   │   └── chat/
│   │       ├── components/
│   │       │   ├── MessageBubble.tsx      # User/assistant bubble container — glass-morphism
│   │       │   ├── ChatInput.tsx          # Input bar — analyze/stop toggle, disabled states
│   │       │   ├── ConversationSidebar.tsx # Conversation list — search, rename, delete
│   │       │   ├── AnalysisLogDisplay.tsx  # Log viewer — NL summary + collapsible technical logs
│   │       │   ├── AnalysisReportCard.tsx  # Report renderer — markdown + themed headers
│   │       │   ├── DownloadEntries.tsx     # File download grid — labeled buttons
│   │       │   ├── ProgressIndicator.tsx   # Shimmering gradient text animation
│   │       │   └── ScrollToBottom.tsx      # FAB with unread badge
│   │       ├── constants.ts               # Welcome message, report labels
│   │       ├── utils.ts                   # Message factory functions
│   │       └── types.ts                   # ChatMessage, Conversation interfaces
│   │
│   ├── contexts/                    # React Context providers (app-level state)
│   │   ├── NewsWebSocketContext.tsx        # Persistent news WebSocket connection
│   │   ├── StockPricesWebSocketContext.tsx # Subscriber-based stock price WebSocket
│   │   ├── HistoricalDataContext.tsx       # In-memory OHLCV cache with 5-min TTL
│   │   ├── DailyReportsContext.tsx         # Report fetching + date/watchlist management
│   │   └── GlobalAlertsContext.tsx         # Market alert system with localStorage persistence
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── useMarketStatus.ts       # Real-time US market open/close + holiday detection
│   │   ├── usePortfolio.ts          # Single portfolio CRUD (localStorage)
│   │   ├── usePortfolios.ts         # Multi-portfolio management (localStorage)
│   │   ├── useStockWatchlist.ts     # Watchlist management (localStorage)
│   │   ├── useRealTimeNews.ts       # News WebSocket lifecycle — subscriptions, reconnect, dedup
│   │   ├── useRealTimeStockPrices.ts # Stock price WebSocket — subscriptions, debounce, cleanup
│   │   ├── useTypewriter.ts         # Character-by-character text animation
│   │   ├── use-mobile.tsx           # Viewport width detection (768px breakpoint)
│   │   ├── use-toast.ts             # Toast notification system (module-level store)
│   │   └── chat/
│   │       └── useConversations.ts  # Chat conversation CRUD — persistence, log batching, dedup
│   │
│   ├── lib/                         # API clients & utilities
│   │   ├── api.js                   # Analysis job API — create, poll, stream (SSE), download
│   │   ├── apiBase.js               # API_BASE_URL resolution (env → runtime → fallback)
│   │   ├── authApi.js               # OAuth + email-code auth — session management, logout
│   │   ├── dailyReportsApi.ts       # Report generation, retrieval (markdown/PDF), batch status
│   │   ├── settingsApi.ts           # Settings CRUD — localStorage backend (API-ready)
│   │   ├── alertExamples.ts         # Seed data for market alert demos
│   │   ├── navigation.ts            # Centralized route config — sidebar items, helpers
│   │   ├── userStorage.js           # User-scoped localStorage (email-namespaced keys)
│   │   └── utils.js                 # Tailwind class merge utility (clsx + tailwind-merge)
│   │
│   ├── utils/
│   │   ├── stocksApi.ts             # Interfaces, mock data, formatting, historical data API
│   │   └── marketHolidays.ts        # US market holiday calculator (NYSE/NASDAQ)
│   │
│   └── types/
│       └── newsWebSocket.ts         # WebSocket protocol types — messages, models, converters
│
├── Dockerfile                       # Multi-stage: Node.js build → Nginx serve
├── docker-compose.dev.yml           # Dev services: API runner + web frontend
├── vite.config.js                   # Dev server proxy, path aliases (@/)
├── tailwind.config.js               # Custom theme tokens, animations, typography plugin
├── tsconfig.json                    # TypeScript config — relaxed for mixed JS/TS codebase
├── components.json                  # shadcn/ui configuration (default style, Slate base)
├── postcss.config.js                # PostCSS with Tailwind + Autoprefixer
└── package.json                     # Dependencies, scripts, metadata
```

---

## Key Design Decisions

### Mixed JavaScript + TypeScript Codebase

The project uses a **progressive TypeScript adoption** strategy. Core infrastructure (App, Navigation, Auth) remains in JSX for rapid iteration, while data-heavy modules (contexts, hooks, API clients, page components) use TypeScript for type safety. The `tsconfig.json` is configured with `strict: false` to accommodate this hybrid approach.

### User-Scoped localStorage

All client-side persistence is routed through `userStorage`, which namespaces keys as `user_{email}_{key}`. This prevents data leakage between authenticated users on shared devices and allows clean logout with `userStorage.clearAll()`.

### Centralized Navigation Config

All sidebar items, route metadata, and breadcrumb data derive from a single `navigation.ts` config. Components like `Sidebar`, `Breadcrumb`, `PageHeader`, and `SectionIndicator` consume this config via helper functions (`getCurrentDashboardPage`, `getCurrentTopLevelSection`), ensuring zero duplication.

### Context Provider Composition

The app root nests five context providers in a specific order that respects dependency relationships:

```
GlobalAlertsProvider
  └── DailyReportsProvider
        └── NewsWebSocketProvider
              └── StockPricesWebSocketProvider
                    └── HistoricalDataProvider
                          └── Routes (pages)
```

### Holiday-Aware Market Status

The `useMarketStatus` hook computes market state client-side with second-level precision, including all 9 NYSE holidays (with algorithmically computed floating holidays like Good Friday via the Anonymous Gregorian Easter algorithm).

---

## API Endpoints Reference

| Endpoint | Method | Description |
|---|---|---|
| `/auth/{provider}/login` | `GET` | OAuth login redirect (Google, GitHub) |
| `/auth/email/request-code` | `POST` | Request email verification code |
| `/auth/email/verify` | `POST` | Verify email code and create session |
| `/auth/session/me` | `GET` | Validate current session cookie |
| `/auth/logout` | `POST` | Destroy session |
| `/chat` | `POST` | Create a new analysis job |
| `/jobs/{id}/status/detailed` | `GET` | Poll job progress and status |
| `/jobs/{id}/logs/stream` | `GET` | SSE stream for real-time logs |
| `/jobs/{id}/stop` | `POST` | Cancel a running job |
| `/jobs/stoppable` | `GET` | List all stoppable jobs |
| `/api/news/health` | `GET` | News WebSocket health check |
| `/api/news/ws` | `WS` | News streaming WebSocket |
| `/api/realtime/health` | `GET` | Stock prices WebSocket health check |
| `/api/realtime/ws` | `WS` | Stock price streaming WebSocket |
| `/api/stocks/{symbol}/history` | `GET` | Historical OHLCV data |
| `/api/daily-reports/company/generate` | `POST` | Generate company report |
| `/api/daily-reports/sector/generate` | `POST` | Generate sector report |
| `/api/daily-reports/company/{ticker}/markdown` | `GET` | Fetch company report (markdown) |
| `/api/daily-reports/company/{ticker}/pdf` | `GET` | Download company report (PDF) |
| `/api/daily-reports/companies/markdown` | `POST` | Batch fetch company reports |
| `/api/daily-reports/company/batch-status` | `POST` | Check batch generation status |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR (port 5173) |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Development build with source maps |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint with zero-warning policy |

---

## Deployment

### Docker Production Build

```bash
# Build multi-platform image
docker buildx build --platform linux/amd64,linux/arm64 \
  -t fuzanwenn/gpt-web:latest \
  --build-arg VITE_RUNNER_URL=https://api.vynnai.com \
  --push .
```

### Infrastructure

| Service | Image | Role |
|---|---|---|
| `web` | `fuzanwenn/gpt-web` | Frontend (Nginx-served SPA) |
| `api` | `fuzanwenn/api-runner` | Backend API (FastAPI + job orchestration) |
| `caddy` | `caddy` | Reverse proxy with automatic HTTPS |

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed Docker configuration and the [Server Cheatsheet](./Server_Chatsheet.md) for deployment operations.

---

## Copyright & Ownership

**© 2026 Zanwen Fu. All Rights Reserved.**

This application and all associated intellectual property — including source code, architecture, design, and implementations — are proprietary and protected by copyright law. Unauthorized reproduction, distribution, or use is strictly prohibited.
