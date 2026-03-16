# Transcriber SaaS

Multi-tenant SaaS for audio/video transcription with AI-powered RAG chat.

**Stack:** Next.js 15 · Tailwind 4 · shadcn/ui · NCB · Contabo S3 · Salad API · Straico API

## Features

- 📤 Drag & drop file upload (audio/video, up to 3 GB)
- 🎙️ Transcription via Salad API (Full + Lite modes, 50+ languages)
- 🔍 RAG-powered AI chat on your transcriptions (with timecoded references)
- 📋 Preset system for saved transcription configurations
- 👥 Multi-tenant workspaces with usage limits
- 📊 Admin panel with system overview
- 🔒 NCB auth with RLS (Row-Level Security)

## Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/transcriber-saas.git
cd transcriber-saas

# 2. Install
npm install

# 3. Configure
cp .env.example .env
# Edit .env with your API keys

# 4. Run dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Production Deploy

```bash
# Docker Compose (Next.js + Caddy with auto-HTTPS)
docker compose up -d
```

Set `DOMAIN=your-domain.com` in `.env` for Caddy to provision TLS automatically.

## Documentation

- [PROJECT.md](./PROJECT.md) — Full project documentation (architecture, API endpoints, RLS config)
- [DB-SCHEMA.md](./DB-SCHEMA.md) — Database schema reference (v5, 32 tables)
- [docs/](../docs/) — API references (NCB, Straico, Salad)

## Architecture

```
Browser → Next.js API Routes → NCB (auth + CRUD)
                             → Contabo S3 (file storage)
                             → Salad API (transcription)
                             → Straico API (RAG + LLM chat)
```

## Environment Variables

See [.env.example](./.env.example) for required configuration.

## License

Private / All rights reserved.
