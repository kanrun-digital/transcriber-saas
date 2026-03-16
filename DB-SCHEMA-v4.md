# Database Schema v4 — FINAL (2026-03-16)

NCB Instance: `55446_crm_transcriber_system`

## Architecture Principles

1. **S3 = source of truth** for all large artifacts (text, JSON, SRT). NCB хранит только метаданные + preview.
2. **S3 keys, NOT presigned URLs** — URLs expire, ключи вечные. URL генерируется on-demand через API.
3. **Agent-per-workspace + RAG-per-transcription** — один agent на воркспейс, каждая транскрипция = своя RAG base.
4. **Granular pipeline** — отдельные статусы для transcription и RAG.
5. **Rich RAG references** — в messages хранятся не просто тексты, а `{ file_id, start, end, speaker, excerpt }`.

---

## Changes from v3

### workspaces — ADD 2 columns

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `straico_agent_id` | string | NULL | Straico Agent ID for this workspace |
| `active_member_count` | integer | 0 | Cached count of active members |

### transcriptions — MODIFY status enum + ADD 5 columns + REMOVE 3 columns

**Status enum change:**
- WAS: `pending, processing, completed, failed`
- NOW: `uploaded, transcribing, completed, failed`

**RAG status (NEW column):**
- `rag_status` enum: `none, pending, syncing, synced, error`

**ADD columns:**

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `transcript_text_url` | string | NULL | S3 key: `{ws}/transcripts/{id}/full_text.txt` |
| `transcript_json_url` | string | NULL | S3 key: `{ws}/transcripts/{id}/transcript.json` |
| `srt_url` | string | NULL | S3 key: `{ws}/transcripts/{id}/captions.srt` |
| `rag_status` | string | 'none' | none/pending/syncing/synced/error |
| `rag_synced_at` | datetime | NULL | Last successful RAG sync time |

**KEEP but repurpose:**
- `transcript_text` — stays as **searchable preview** (first 500 chars), NOT full text
- `transcript_segments_json` → NULL always (artifacts in S3). Can drop later or reuse for short metadata.
- `srt_content` → NULL always (SRT in S3). Can drop later.

**NOTE:** `*_url` columns store S3 **keys** (not presigned URLs). Example: `42/transcripts/7/full_text.txt`. API generates presigned download URL on demand.

### messages — CHANGE rag_references_json format

**WAS:** plain text or simple array
**NOW:** structured JSON array:
```json
[
  {
    "transcription_id": 7,
    "rag_base_id": 12,
    "file_name": "lecture-01.mp3",
    "start_seconds": 74,
    "end_seconds": 87,
    "speaker": "SPEAKER_02",
    "excerpt": "But that voice also speaks to other people.",
    "relevance_score": 0.87
  }
]
```
No schema change needed — `rag_references_json` is already a string column.

### rag_bases — semantic change

**WAS:** one per workspace (shared)
**NOW:** one per transcription

No column changes. `transcriptions.rag_base_id` already links them. Just different usage pattern:
- Each transcription creates its own `rag_bases` record
- `rag_bases.name` = filename of the transcription
- Workspace agent links to ALL its rag_bases via `agent_rag_links`

---

## Complete Table Reference (v4)

### 1. workspaces

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| name | string | no | — | |
| slug | string | yes | NULL | URL-friendly |
| plan | enum | yes | 'free' | free/pro/enterprise |
| status | enum | yes | 'active' | active/suspended |
| **straico_agent_id** | **string** | **yes** | **NULL** | **🆕 Straico Agent ID** |
| **active_member_count** | **integer** | **yes** | **0** | **🆕 Cached member count** |
| metadata_json | string | yes | '{}' | |
| created_at | datetime | yes | NULL | |
| updated_at | datetime | yes | NULL | |
| user_id | string | yes | NULL | FK → ncba_user.id (owner) |
| salad_minutes_limit | integer | yes | 0 | Monthly transcription cap |
| salad_minutes_used | number | yes | 0 | Current period usage |
| straico_coins_limit | integer | yes | 0 | Monthly AI credits cap |
| straico_coins_used | number | yes | 0 | Current period usage |
| billing_period_start | datetime | yes | NULL | Auto-reset anchor |
| max_file_size_mb | integer | yes | 500 | Per-file upload limit |
| max_storage_gb | number | yes | 10 | Total storage quota |
| storage_used_bytes | integer | yes | 0 | Current usage counter |
| max_rag_bases | integer | yes | 3 | RAG bases per workspace |
| max_agents | integer | yes | 1 | Agents per workspace |
| max_members | integer | yes | 5 | Team members limit |
| max_transcriptions | integer | yes | 100 | Total transcriptions limit |
| default_salad_mode | string | yes | 'full' | full or lite |
| default_model_id | string | yes | NULL | Default LLM model |

### 7. transcriptions

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | |
| app_user_id | integer | no | — | |
| project_id | integer | yes | NULL | FK → projects.id |
| storage_path | string | yes | NULL | S3 key for audio |
| storage_url | string | yes | NULL | |
| original_filename | string | yes | NULL | |
| mime_type | string | yes | NULL | |
| file_size_bytes | integer | yes | NULL | |
| duration_seconds | number | yes | NULL | Audio length |
| language | string | yes | NULL | Requested language |
| enable_diarization | integer | yes | 0 | |
| num_speakers | integer | yes | NULL | Detected speakers |
| **status** | **enum** | **no** | **'uploaded'** | **uploaded/transcribing/completed/failed** |
| transcript_text | string | yes | NULL | **Preview only** (first 500 chars, indexed) |
| transcript_segments_json | string | yes | NULL | Legacy — NULL in v4, use S3 |
| **transcript_text_url** | **string** | **yes** | **NULL** | **🆕 S3 key: full_text.txt** |
| **transcript_json_url** | **string** | **yes** | **NULL** | **🆕 S3 key: transcript.json** |
| **srt_url** | **string** | **yes** | **NULL** | **🆕 S3 key: captions.srt** |
| detected_language | string | yes | NULL | |
| salad_job_id | string | yes | NULL | Salad API job ID |
| salad_mode | string | yes | 'full' | full or lite |
| srt_content | string | yes | NULL | Legacy — NULL in v4, use S3 |
| summary | string | yes | NULL | AI-generated summary |
| processing_time_seconds | number | yes | NULL | |
| word_count | integer | yes | NULL | |
| rag_synced | integer | yes | 0 | 1 = synced |
| **rag_status** | **string** | **yes** | **'none'** | **🆕 none/pending/syncing/synced/error** |
| **rag_synced_at** | **datetime** | **yes** | **NULL** | **🆕 Last RAG sync time** |
| storage_file_id | integer | yes | NULL | FK → storage_files |
| transcript_file_id | integer | yes | NULL | FK → storage_files |
| rag_base_id | integer | yes | NULL | FK → rag_bases (per-transcription) |
| sentiment | string | yes | NULL | |
| topics_json | string | yes | '[]' | |
| error_message | string | yes | NULL | |
| metadata_json | string | yes | NULL | |
| deleted_at | datetime | yes | NULL | Soft delete |
| created_at | datetime | yes | auto | |
| updated_at | datetime | yes | auto | |
| user_id | string | yes | NULL | |

---

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

### transcript.json format
```json
{
  "duration_seconds": 3600,
  "word_count": 12500,
  "segments": [
    { "start": 0.0, "end": 3.2, "text": "Hello everyone", "speaker": "SPEAKER_00" },
    { "start": 3.5, "end": 7.1, "text": "Today we discuss...", "speaker": "SPEAKER_00" }
  ]
}
```

### rag_input.txt format (timestamped for Straico)
```
# Transcript: lecture-01.mp3

[00:00:00 - 00:00:03] SPEAKER_00: Hello everyone
[00:00:03 - 00:00:07] SPEAKER_00: Today we discuss...
[00:01:24 - 00:01:27] SPEAKER_02: But that voice also speaks to other people.
```

---

## Pipeline State Machine

```
Upload:
  uploaded → transcribing → completed → (auto) → ready
               ↓                          ↓
            failed                    index_error

Detailed:
  transcriptions.status:   uploaded → transcribing → completed | failed
  transcriptions.rag_status: none → pending → syncing → synced | error

UI composite status:
  uploaded                    = "Uploaded"    (gray)
  transcribing                = "Transcribing" (blue spinner)
  completed + rag_status=none = "Ready"       (green) — no RAG
  completed + rag_status=pending  = "Indexing queued" (yellow)
  completed + rag_status=syncing  = "Indexing..."     (blue)
  completed + rag_status=synced   = "Indexed ✅"      (green)
  completed + rag_status=error    = "Index error ⚠️"  (orange)
  failed                          = "Failed ❌"       (red)
```

---

## RAG Architecture

```
Workspace (straico_agent_id)
  └── Agent
      ├── rag_bases[0] ← transcription #1 (rag_input.txt)
      ├── rag_bases[1] ← transcription #2 (rag_input.txt)
      └── rag_bases[2] ← transcription #3 (rag_input.txt)

agent_rag_links: agent_id → rag_base_id (one link per transcription)

Chat flow:
  User asks question → Straico queries agent → agent searches all linked RAGs
  → returns answer + references (with timestamps from rag_input.txt)
  → We parse timestamps and map back to transcription_id
```

---

## RAG References in Messages (v4 format)

`messages.rag_references_json`:
```json
[
  {
    "transcription_id": 7,
    "rag_base_id": 12,
    "file_name": "lecture-01.mp3",
    "start_seconds": 74,
    "end_seconds": 87,
    "speaker": "SPEAKER_02",
    "excerpt": "But that voice also speaks to other people.",
    "relevance_score": 0.87
  }
]
```

This enables the Sources panel to:
- Show which file the answer came from
- Show the exact timestamp in the audio
- Show the speaker who said it
- Let the user click to jump to that moment

---

## Migration Guide (v3 → v4)

### In NCB Panel — ADD columns:

```
workspaces:
  + straico_agent_id       (text, nullable)
  + active_member_count    (integer, nullable, default 0)

transcriptions:
  + transcript_text_url    (text, nullable)
  + transcript_json_url    (text, nullable)
  + srt_url                (text, nullable)
  + rag_status             (text, nullable, default 'none')
  + rag_synced_at          (datetime, nullable)
```

### In NCB Panel — CHANGE defaults:

```
transcriptions.status:
  default: 'uploaded' (was 'pending')
```

### In code — semantic changes:

1. `transcript_text` → only store first 500 chars (preview)
2. `transcript_segments_json` → always NULL (data in S3)
3. `srt_content` → always NULL (data in S3)
4. `transcript_text_url` → stores S3 **key** like `42/transcripts/7/full_text.txt`
5. Status values: `uploaded` → `transcribing` → `completed` | `failed`
6. RAG status: `none` → `pending` → `syncing` → `synced` | `error`

### NO changes needed:
- All other tables stay as-is
- rag_bases, agent_rag_links, rag_agents — same columns, different usage pattern
- messages.rag_references_json — same column, richer JSON content
- All FKs and cascades unchanged

---

## Enum Values (v4 FINAL)

| Table | Column | Values |
|-------|--------|--------|
| workspaces | plan | `free`, `pro`, `enterprise` |
| workspaces | status | `active`, `suspended` |
| app_users | role | `owner`, `admin`, `member`, `viewer` |
| organization_members | member_role | `owner`, `admin`, `member`, `viewer` |
| organization_members | status | `active`, `invited`, `suspended` |
| **transcriptions** | **status** | **`uploaded`, `transcribing`, `completed`, `failed`** |
| **transcriptions** | **rag_status** | **`none`, `pending`, `syncing`, `synced`, `error`** |
| messages | role | `system`, `user`, `assistant`, `tool` |
| message_attachments | attachment_type | `file`, `image`, `youtube`, `audio`, `video` |
| message_attachments | source | `local`, `straico`, `external`, `storage` |
| generated_assets | asset_type | `image`, `video`, `audio`, `zip` |
| rag_agents | status | `active`, `inactive`, `error`, `deleted` |
| rag_bases | status | `pending`, `processing`, `active`, `error`, `deleted` |
| storage_files | storage_status | `pending`, `uploaded`, `deleted` |
| straico_requests | status | `pending`, `completed`, `failed` |
| usage_log | usage_type | `transcription`, `rag_query`, `chat`, `storage` |
