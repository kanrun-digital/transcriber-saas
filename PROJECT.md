# Transcriber SaaS — Project Documentation (v9)

Last updated: 2026-03-16

## Overview

Multi-tenant SaaS: upload audio/video → transcribe via Salad → store transcript → Straico RAG → AI chat.

**Target:** ~15 users (friends/team), then public SaaS.

## Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15 + Tailwind 4 + shadcn/ui + TanStack Query + Zustand | SSR + client state |
| Auth + DB | NoCodeBackend (NCB) | Auth, CRUD, RLS |
| Storage | Contabo S3 (250 GB) | Audio + transcripts |
| Transcription | Salad API (250 hrs/mo) | Speech-to-text (Full + Lite modes) |
| LLM + RAG | Straico API (built-in FAISS) | AI chat on transcripts |
| Hosting | Contabo Berlin VPS (Docker) | Next.js + Caddy |

## Architecture

```
Browser → Next.js (API routes) → NCB (auth + CRUD)
                               → Contabo S3 (presigned upload)
                               → Salad API (transcription jobs)
                               → Straico API (RAG + chat)

Upload flow:
  1. POST /api/upload/presign → creates storage_files + transcriptions records, returns presigned URL
  2. Browser PUT → S3 (direct upload with XHR progress)
  3. POST /api/upload/complete → verifies S3, checks limits, triggers Salad job
  4. Salad processes → POST /api/transcribe/webhook → saves results to S3, records usage
  5. Auto-sync to RAG (or manual Reindex button)

Chat flow:
  1. POST /api/rag/query → finds RAG base, creates/reuses conversation
  2. Saves user message → queries Straico RAG → saves assistant message with references
  3. Logs straico_requests + straico_usage + usage_log

Artifact retrieval:
  1. GET /api/transcriptions/[id]/artifacts → generates presigned S3 URLs on demand
  2. S3 keys (permanent) stored in NCB, presigned URLs (1hr expiry) generated per request
```

## NCB Instance

- **Instance:** `55446_crm_transcriber_system`
- **Data API:** `https://openapi.nocodebackend.com`
- **Auth API:** `https://app.nocodebackend.com/api/user-auth`
- **32 tables** — see `DB-SCHEMA.md` (v5) for full reference
- **Swagger:** `docs/ncb-swagger.json`

## Database Schema (v5)

Full reference: `DB-SCHEMA.md` (v5, 32 tables, ~35KB)

### Table Groups

| Group | Tables | Purpose |
|-------|--------|---------|
| **Core** | workspaces, app_users, organization_members | Multi-tenant workspace system |
| **Storage** | storage_backends, storage_files, storage_file_events | S3 file management + audit |
| **Transcription** | transcriptions, projects, tags, transcription_tags | Audio transcription pipeline |
| **Presets** | presets | Saved transcription configurations |
| **RAG/AI** | rag_bases, rag_agents, agent_rag_links, agent_access | Straico RAG agents |
| **Chat** | conversations, messages, message_attachments | AI chat with RAG |
| **Straico** | straico_accounts, straico_models, straico_requests, straico_outputs, straico_usage | API audit/billing |
| **Billing** | usage_log | Generic usage tracking |
| **Accounts** | salad_accounts | Per-workspace Salad API keys |
| **Generated** | generated_assets | AI-generated media |
| **NCB Auth** | ncba_user, ncba_account, ncba_session, ncba_verification, ncba_config, ncba_rls_config | Auth system |

### Pipeline State Machine

```
transcriptions.status:    uploaded → transcribing → completed | failed
transcriptions.rag_status: none → pending → syncing → synced | error
```

## File Structure (v9 — 73 source files, 6617 lines)

```
transcriber-saas/
├── package.json              Dependencies
├── next.config.ts            Next.js 15 config
├── tailwind.config.ts        Tailwind 4 config
├── postcss.config.mjs        PostCSS config
├── tsconfig.json             TypeScript config
├── .env.example              Environment variables template
├── Dockerfile                Multi-stage Node.js build
├── docker-compose.yml        App + Caddy reverse proxy
├── Caddyfile                 Auto-HTTPS config
├── DB-SCHEMA.md              Database schema reference (v5, 32 tables)
├── DB-SCHEMA-v4.md           Migration guide v3→v4
├── PROJECT.md                This file
└── src/
    ├── app/
    │   ├── layout.tsx                Root layout (Providers, Ukrainian lang)
    │   ├── page.tsx                  Redirect → /dashboard
    │   ├── globals.css               shadcn CSS variables + Tailwind
    │   ├── (auth)/
    │   │   ├── layout.tsx            Centered auth layout
    │   │   ├── login/page.tsx        Login form
    │   │   └── signup/page.tsx       Registration form
    │   ├── (app)/
    │   │   ├── layout.tsx            Sidebar + auth guard + workspace loader
    │   │   ├── dashboard/page.tsx    Stats overview + recent transcriptions
    │   │   ├── upload/page.tsx       Multi-step: select → upload → configure → submit
    │   │   ├── transcriptions/
    │   │   │   ├── page.tsx          List with search, status filter tabs, table+cards
    │   │   │   └── [id]/page.tsx     Detail: metadata, transcript, download, Reindex, chat
    │   │   ├── presets/page.tsx      Preset management (public/private tabs)
    │   │   ├── chat/page.tsx         RAG chat with sources panel
    │   │   ├── settings/page.tsx     Profile + workspace settings
    │   │   └── admin/page.tsx        Admin panel (stats, users, transcriptions)
    │   └── api/
    │       ├── auth/[...path]/route.ts           Auth proxy → NCB
    │       ├── data/[...path]/route.ts           Data proxy → NCB (with RLS)
    │       ├── upload/presign/route.ts           Presigned URL + records + limit checks
    │       ├── upload/complete/route.ts          Verify S3 + trigger Salad
    │       ├── transcribe/webhook/route.ts       Salad callback → S3 artifacts + usage
    │       ├── transcriptions/[id]/route.ts      GET + soft delete + S3 cleanup
    │       ├── transcriptions/[id]/sync-rag/route.ts  Manual RAG sync
    │       ├── transcriptions/[id]/artifacts/route.ts  Presigned download URLs
    │       ├── rag/query/route.ts                RAG chat + messages + usage
    │       └── usage/route.ts                    Dashboard summary + quotas
    ├── lib/
    │   ├── ncb.ts            NCB DRY utility (CRUD + auth + search + RLS)
    │   ├── s3.ts             Contabo S3 (presigned URLs + artifacts + cleanup)
    │   ├── salad.ts          Salad transcription API client (Full + Lite)
    │   ├── straico.ts        Straico RAG + chat + file upload
    │   ├── usage.ts          Limits + usage_log + storage + quotas
    │   └── utils.ts          cn(), formatBytes, formatDuration, formatDate
    ├── types/
    │   └── index.ts          All TypeScript interfaces (Workspace, Transcription, Preset, etc.)
    ├── constants/
    │   ├── languages.ts      ~50 languages for transcription selector
    │   ├── entities.ts       NCB table names
    │   ├── limits.ts         File size/duration/format limits
    │   └── routes.ts         App route constants
    ├── services/
    │   ├── api-client.ts     Base HTTP client (auto-redirect on 401)
    │   ├── auth.ts           Login/signup/logout/session
    │   ├── transcriptions.ts CRUD + artifact URLs + RAG sync
    │   ├── presets.ts         Preset CRUD
    │   ├── upload.ts          Presign + S3 PUT + complete
    │   ├── chat.ts            RAG query
    │   └── admin.ts           Admin stats + users + transcriptions
    ├── stores/
    │   ├── auth-store.ts     Zustand: user, workspace, isAdmin
    │   └── upload-store.ts   Zustand: files, progress, step management
    ├── hooks/
    │   ├── use-auth.ts       TanStack Query: session, login, signup, logout
    │   ├── use-transcriptions.ts  TanStack Query: list + search + filters
    │   ├── use-upload.ts     Upload orchestration (presign → PUT → complete)
    │   ├── use-file-validation.ts  Client-side file checks
    │   ├── use-file-state.ts      File selection state machine
    │   ├── use-transcription-settings.ts  Settings + preset loading
    │   ├── use-presets.ts    TanStack Query: preset CRUD
    │   ├── use-workspace.ts  Current workspace from auth store
    │   ├── use-usage.ts      TanStack Query: usage dashboard
    │   └── use-mobile.ts     Responsive breakpoint detection
    └── components/
        ├── providers/index.tsx       QueryClient + Toaster + AuthInit
        ├── layout/
        │   ├── app-sidebar.tsx       Navigation sidebar with workspace info
        │   ├── app-header.tsx        Top bar with mobile menu
        │   └── user-menu.tsx         Avatar dropdown (settings, admin, logout)
        ├── upload/
        │   ├── file-dropzone.tsx     react-dropzone with validation
        │   ├── upload-progress.tsx   Per-file progress bars
        │   └── transcription-settings.tsx  Language, diarization, preset selector
        ├── transcriptions/
        │   ├── transcription-table.tsx  Desktop table view
        │   ├── transcription-card.tsx   Mobile card view
        │   └── status-badge.tsx         Composite status + rag_status badge
        ├── dashboard/
        │   ├── stats-overview.tsx    Usage cards (minutes, coins, storage, files)
        │   └── recent-transcriptions.tsx  Latest 5 transcriptions
        ├── presets/
        │   ├── preset-card.tsx       Preset display card
        │   └── preset-selector.tsx   Dropdown in upload settings
        ├── chat/
        │   ├── chat-input.tsx        Message input with send button
        │   ├── chat-message.tsx      User/assistant message bubble
        │   └── sources-panel.tsx     RAG references with timestamps
        └── admin/
            └── admin-guard.tsx       Role-based access control

```

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| * | `/api/auth/*` | — | Proxy to NCB auth (sign-up, sign-in, get-session, sign-out) |
| * | `/api/data/*` | Cookie | Proxy to NCB data (RLS applied) |
| POST | `/api/upload/presign` | Cookie | Get presigned S3 URL + create records |
| POST | `/api/upload/complete` | Cookie | Verify upload + start transcription |
| POST | `/api/transcribe/webhook` | Secret | Salad callback (server-to-server) |
| GET | `/api/transcriptions/:id` | Cookie | Get transcription detail |
| DELETE | `/api/transcriptions/:id` | Cookie | Soft delete + S3 cleanup + RAG cleanup |
| POST | `/api/transcriptions/:id/sync-rag` | Cookie | Sync transcript to Straico RAG |
| GET | `/api/transcriptions/:id/artifacts` | Cookie | Presigned download URLs (TXT, JSON, SRT) |
| POST | `/api/rag/query` | Cookie | Query RAG + save conversation |
| GET | `/api/usage` | Cookie | Usage dashboard summary |

## Workspace Limits (configurable per workspace)

| Limit | Default | Column |
|-------|---------|--------|
| Transcription minutes/month | 0 | salad_minutes_limit |
| AI coins/month | 0 | straico_coins_limit |
| Storage GB | 10 | max_storage_gb |
| Max file size MB | 500 | max_file_size_mb |
| Max RAG bases | 3 | max_rag_bases |
| Max agents | 1 | max_agents |
| Max members | 5 | max_members |
| Max transcriptions | 100 | max_transcriptions |
| Default Salad mode | full | default_salad_mode |
| Default LLM model | null | default_model_id |

## Environment Variables

See `.env.example` for full list. Key vars:
- `NCB_INSTANCE` — NCB instance name
- `NCB_DATA_URL` — Data API URL
- `NCB_AUTH_URL` — Auth API URL
- `NCB_SECRET_KEY` — Server-side API key (bypasses RLS)
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` — Contabo S3
- `SALAD_API_KEY`, `SALAD_ORG` — Salad transcription
- `STRAICO_API_KEY` — Straico AI
- `DOMAIN` — For Caddy HTTPS

## Presets System (v5)

Users save transcription configurations for reuse:
- **Categories:** transcription, translation, summary, youtube
- **Visibility:** public (workspace-wide) or private (creator only)
- **Config:** language, diarization, num_speakers, salad_mode, summarize, summary_prompt
- **Usage:** Select preset on Upload page → auto-fills transcription settings
- **RLS:** `shared_read` (public presets visible to all workspace members)

## Source Types (v5)

Transcriptions track their origin:
- `upload` — standard file upload (default)
- `youtube_url` — YouTube video transcription (future: n8n Service 4)
- `external_url` — external audio/video URL
- `voice` — in-app voice recording

## Soft Deletes

Three tables use `deleted_at` column instead of hard delete:
- `transcriptions` — DELETE sets deleted_at, cleans up S3 artifacts + Straico RAG base, releases storage
- `conversations` — Archived conversations kept for history
- `rag_bases` — Deactivated RAG bases kept for audit

All queries must filter `WHERE deleted_at IS NULL`.

## S3 Artifact Structure

```
{workspace_id}/
├── audio/
│   └── {uuid}-{filename}              ← original upload
└── transcripts/
    └── {transcription_id}/
        ├── full_text.txt               ← complete plain text
        ├── transcript.json             ← timestamped segments + metadata
        ├── captions.srt                ← SRT subtitles
        └── rag_input.txt               ← timestamped for Straico RAG
```

**Important:** `transcriptions.*_url` columns store S3 **keys** (e.g. `42/transcripts/7/full_text.txt`), NOT presigned URLs. Presigned URLs are generated on-demand via `/api/transcriptions/[id]/artifacts` (1-hour expiry).

## RAG Architecture

```
Workspace (straico_agent_id)
  └── Agent (rag_agents)
      ├── rag_bases[0] ← transcription #1 (rag_input.txt)
      ├── rag_bases[1] ← transcription #2 (rag_input.txt)
      └── rag_bases[2] ← transcription #3 (rag_input.txt)

agent_rag_links: agent_id → rag_base_id (one link per transcription)
```

- **rag_input.txt format:** `[HH:MM:SS - HH:MM:SS] Speaker: text` — enables timecoded RAG references
- **Auto-sync:** after transcription completion, `rag_status` transitions: none → pending → syncing → synced
- **Manual Reindex:** button on transcription detail page forces re-sync

## Known Issues (NCB Limitations)

Individual unique constraints on link tables prevent multiple associations:
- `organization_members` — 1 user per workspace, 1 workspace per user
- `agent_rag_links` — 1 agent per RAG base, 1 RAG base per agent
- `agent_access` — 1 agent per user, 1 user per agent
- `tags` / `transcription_tags` — 1 tag per workspace, 1 tag per transcription
- `storage_files.bucket_name` — unique globally (all files share 1 bucket)

Workaround: check-before-insert in code. For MVP acceptable.

## Deployment

```bash
# 1. Clone and configure
cp .env.example .env
# Edit .env with real values

# 2. Build and run
docker compose up -d

# 3. Caddy auto-provisions HTTPS for $DOMAIN
```

## RLS Configuration

Add to `ncba_rls_config` in NCB panel:

| table_name | policy |
|------------|--------|
| workspaces | private |
| app_users | shared_read |
| organization_members | shared_read |
| storage_backends | private |
| storage_files | private |
| storage_file_events | private |
| transcriptions | shared_read |
| projects | shared_read |
| tags | shared_read |
| transcription_tags | shared_read |
| presets | shared_read |
| conversations | private |
| messages | private |
| message_attachments | private |
| rag_bases | shared_read |
| rag_agents | shared_read |
| agent_rag_links | shared_read |
| agent_access | shared_read |
| straico_accounts | private |
| salad_accounts | private |
| straico_models | shared_read |
| straico_requests | private |
| straico_outputs | private |
| straico_usage | private |
| generated_assets | private |
| usage_log | private |

## Next Steps

- [ ] Configure RLS policies in ncba_rls_config
- [ ] Deploy to Contabo VPS
- [ ] Test end-to-end: signup → upload → transcribe → RAG chat
- [ ] Set up workspace with limits for first users
- [ ] YouTube flow (n8n Service 4 integration)
- [ ] Voice recording feature
