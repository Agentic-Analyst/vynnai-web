# Docker Setup for Stock Analysis Integration

This Docker configuration provides the complete stock analysis backend services integrated with your ChatGPT-style interface.

## Services

- **Frontend** (Port 8080): React/Vite development server with your ChatGPT interface
- **Backend** (Port 8000): FastAPI stock analysis API runner
- **Stock Analyst**: Core stock analysis engine

## Quick Start

### Option 1: Full Stack with Docker
```bash
# Start all services (frontend + backend)
docker compose up

# Start in background
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Option 2: Frontend Only (Development)
```bash
# Install dependencies
npm install

# Start development server (uses local backend on port 8000)
npm run dev
```

## Usage

1. **Access the application**: http://localhost:8080
2. **Set your OpenAI API key** in settings (top-right gear icon)
3. **Regular chat**: Type any message for normal AI chat
4. **Stock analysis**: Type queries like:
   - "analyze AAPL stock"
   - "TSLA financial analysis"
   - "stock analysis for Microsoft"

## How it Works

The ChatGPT interface now includes integrated stock analysis:

- **Regular queries** → OpenAI GPT API (normal chat)
- **Stock-related queries** → Stock analysis backend (SSE streaming with progress)
- **Automatic detection** of stock queries using keywords and ticker patterns
- **Download capabilities** for analysis reports when complete

## Environment Variables

- `VITE_API_BASE_URL`: Backend API base URL (default: http://localhost:8000)
- `OPENAI_API_KEY`: Stored in browser localStorage via settings modal

## Volumes

- `stockdata`: Persistent storage for stock analysis data and reports
