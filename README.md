# AI Chat Platform with Stock Analysis

A ChatGPT-style interface enhanced with intelligent stock analysis capabilities. 

## Features

- **Classic ChatGPT Interface**: Familiar chat UI with conversation history, search, and settings
- **Intelligent Query Routing**: Automatically detects stock-related queries and routes to appropriate API
- **Stock Analysis Integration**: Real-time streaming analysis with progress updates and downloads
- **Dual API Support**: 
  - OpenAI GPT API for general chat
  - Stock Analysis API for financial analysis with SSE streaming

## Quick Start

### Development Mode
```bash
npm install
npm run dev
```
Access at: http://localhost:8081

### Full Stack with Docker
```bash
docker compose up
```
Access at: http://localhost:8080

### Upload to Hetzner
docker buildx create --name vynnx --use 2>/dev/null || docker buildx use vynnx
docker buildx inspect --bootstrap
docker buildx build --platform linux/amd64,linux/arm64 \
  -t fuzanwenn/gpt-web:latest \
  --build-arg VITE_RUNNER_URL=https://api.vynnai.com \
  --push .

ssh root@5.223.46.44
cd /root/vynn

### Pull new images and restart only what changed
docker compose pull web && docker compose up -d web      # frontend update
docker compose pull api && docker compose up -d api      # backend update

### Sanity checks
docker compose ps
docker compose logs -f caddy
curl -I https://app.vynnai.com
curl -I https://api.vynnai.com/health

docker compose logs -f api
docker compose logs -f web
docker compose logs -f caddy


## Usage

1. **Set OpenAI API Key**: Click the settings icon (⚙️) to configure your API key
2. **Regular Chat**: Ask any question for normal AI chat
3. **Stock Analysis**: Try queries like:
   - "analyze AAPL stock"
   - "TSLA financial analysis" 
   - "stock report for Microsoft"

## Architecture

- **Frontend**: React + Vite with shadcn/ui components
- **Chat API**: OpenAI GPT-4o-mini for conversations
- **Stock API**: FastAPI backend with SSE streaming
- **Integration**: Intelligent query detection and routing

## Docker Services

- `frontend`: React development server
- `backend`: Stock analysis API runner (fuzanwenn/api-runner:latest)
- `stock-analyst`: Analysis engine (fuzanwenn/stock-analyst:latest)

See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed Docker configuration.

## Project Structure

```
src/
├── pages/
│   ├── ChatPage.jsx     # Main chat interface with stock integration
│   ├── LandingPage.jsx  # API key setup
│   └── DashboardPage.jsx
├── components/
│   ├── Navigation.jsx   # Top navigation
│   ├── SettingsModal.jsx
│   └── ui/             # shadcn/ui components
└── lib/
    ├── api.js          # Stock analysis API client
    └── utils.js        # Utilities
```

## Technologies

- **Frontend**: React 18, Vite, shadcn/ui, Tailwind CSS
- **Backend**: FastAPI, Server-Sent Events (SSE)
- **APIs**: OpenAI GPT-4o-mini, Stock Analysis REST API
- **Deployment**: Docker Compose

## Copyright & Ownership

**© 2026 Zanwen Fu. All Rights Reserved.**

This application and all associated intellectual property rights are owned by Zanwen Fu. The source code, design, architecture, and implementations are proprietary and protected by copyright law.
