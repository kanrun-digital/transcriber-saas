# Database Schema Reference — v5 (2026-03-16)

NCB Instance: `55446_crm_transcriber_system`
Generated: 2026-03-16T11:25:21.915Z

---

## Overview

32 tables total. 7 NCB system tables (`ncba_*`) + 23 application tables.

### Table Groups

| Group | Tables | Purpose |
|-------|--------|---------|
| **Core** | workspaces, app_users, organization_members | Multi-tenant workspace system |
| **Storage** | storage_backends, storage_files, storage_file_events | S3 file management + audit |
| **Transcription** | transcriptions, projects, tags, transcription_tags | Audio transcription pipeline |
| **RAG/AI** | rag_bases, rag_agents, agent_rag_links, agent_access | Straico RAG agents |
| **Chat** | conversations, messages, message_attachments | AI chat with RAG |
| **Straico** | straico_accounts, straico_models, straico_requests, straico_outputs, straico_usage | API request/response/billing |
| **Billing** | usage_log | Generic usage tracking |
| **Accounts** | salad_accounts | Per-workspace Salad API keys |
| **Presets** | presets | Saved transcription configurations |
| **Generated** | generated_assets | AI-generated media |
| **NCB Auth** | ncba_user, ncba_account, ncba_session, ncba_verification, ncba_config, ncba_rls_config | Auth system (managed by NCB) |

---

## Architecture Principles (v4)

1. **S3 = source of truth** for all large artifacts (text, JSON, SRT). NCB stores only metadata + preview.
2. **S3 keys, NOT presigned URLs** — URLs expire, keys are permanent. URLs generated on-demand by API.
3. **Agent-per-workspace + RAG-per-transcription** — one Straico agent per workspace, each transcription = its own RAG base.
4. **Granular pipeline** — separate `status` (transcription) + `rag_status` (RAG).
5. **Rich RAG references** — `messages.rag_references_json` stores `{ transcription_id, start_seconds, end_seconds, speaker, excerpt }`.

---

## v3 → v4 Changes

### workspaces — 2 NEW columns
| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `straico_agent_id` | string | NULL | Straico Agent ID for this workspace |
| `active_member_count` | integer | 0 | Cached count of active members |

### transcriptions — 5 NEW columns + status change
| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `transcript_text_url` | string | NULL | S3 key: `{ws}/transcripts/{id}/full_text.txt` |
| `transcript_json_url` | string | NULL | S3 key: `{ws}/transcripts/{id}/transcript.json` |
| `srt_url` | string | NULL | S3 key: `{ws}/transcripts/{id}/captions.srt` |
| `rag_status` | string | 'none' | none/pending/syncing/synced/error |
| `rag_synced_at` | datetime | NULL | Last successful RAG sync |

**Status default changed:** `'pending'` → `'uploaded'`
**Status enum expanded:** `uploaded, transcribing, completed, failed, pending, processing, error` (backward compatible)

### Semantic changes (no schema change)
- `transcript_text` → only first 500 chars (searchable preview)
- `transcript_segments_json` → always NULL (data in S3)
- `srt_content` → always NULL (data in S3)
- `*_url` columns store S3 **keys** (e.g. `42/transcripts/7/full_text.txt`), not presigned URLs

---

## v4 → v5 Changes

### NEW TABLE: presets
Saved transcription configurations (language, diarization, full/lite, etc.). Users can save and reuse settings. Categories: transcription/translation/summary/youtube. Supports public (workspace-wide) and private presets.

### transcriptions — 1 NEW column
| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `source_type` | string | 'upload' | Origin: upload/youtube_url/external_url/voice |

---

## 1. workspaces

Tenant/organization. All data scoped by workspace_id.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| name | string | no | — | |
| slug | string | yes | NULL | URL-friendly |
| plan | enum | yes | 'free' | free/pro/enterprise |
| status | enum | yes | 'active' | active/suspended |
| metadata_json | string | yes | '{}' | |
| created_at | datetime | yes | NULL | |
| updated_at | datetime | yes | NULL | |
| user_id | string | yes | NULL | FK → ncba_user.id (owner) |
| **straico_agent_id** | **string** | **yes** | **NULL** | **🆕 Straico Agent ID** |
| **active_member_count** | **integer** | **yes** | **0** | **🆕 Cached member count** |
| **Limits** | | | | |
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

**FK:** user_id → ncba_user.id

---

## 2. app_users

Application-level users linked to NCB auth. One per workspace membership.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | FK → workspaces.id |
| ncb_user_id | string | yes | NULL | Links to ncba_user.id |
| email | string | no | — | **unique** |
| name | string | yes | NULL | |
| role | enum | yes | 'member' | owner/admin/member/viewer |
| is_active | integer | yes | 1 | |
| last_seen_at | datetime | yes | NULL | |
| metadata_json | string | yes | '{}' | |
| created_at | datetime | yes | NULL | |
| updated_at | datetime | yes | NULL | |
| user_id | string | yes | NULL | FK → ncba_user.id (RLS) |

---

## 3. organization_members

Links app_users to workspaces with roles.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | FK → workspaces.id ⚠️ unique |
| app_user_id | integer | no | — | FK → app_users.id ⚠️ unique |
| member_role | enum | yes | 'member' | owner/admin/member/viewer |
| status | enum | yes | 'active' | active/invited/suspended |
| invited_by | integer | yes | NULL | FK → app_users.id |
| created_at | datetime | yes | NULL | |
| updated_at | datetime | yes | NULL | |
| user_id | string | yes | NULL | FK → ncba_user.id |

⚠️ **Bug:** workspace_id and app_user_id are each individually unique (not composite). Workaround: check before insert.

---

## 4. storage_backends

S3-compatible storage configuration per workspace.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | ⚠️ unique (1 backend per ws) |
| provider | enum | no | 'contabo_s3' | |
| bucket_name | string | no | — | ⚠️ unique |
| endpoint | string | no | — | S3 endpoint URL |
| region_name | string | yes | NULL | |
| key_prefix | string | yes | NULL | Path prefix in bucket |
| default_visibility | enum | no | 'private' | |
| public_base_url | string | yes | NULL | CDN URL |
| is_active | integer | no | 1 | |
| access_key_encrypted | string | no | — | Encrypted S3 access key |
| secret_key_encrypted | string | no | — | Encrypted S3 secret key |
| access_key_last4 | string | yes | NULL | For display |
| metadata_json | string | yes | NULL | |
| created_at | datetime | yes | auto | |
| updated_at | datetime | yes | auto | |
| user_id | string | yes | NULL | |

---

## 5. storage_files

Every file stored in S3 (audio uploads + transcripts).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | |
| owner_user_id | integer | no | — | |
| backend_id | integer | yes | NULL | FK → storage_backends.id (SET NULL) |
| entity_type | enum | no | 'generic' | audio/transcript/generic |
| entity_id | integer | yes | NULL | Links to transcription etc. |
| bucket_name | string | no | — | ⚠️ unique (bug) |
| object_key | string | no | — | ⚠️ unique (correct) |
| original_name | string | yes | NULL | |
| mime_type | string | yes | NULL | |
| file_size_bytes | integer | yes | NULL | |
| etag | string | yes | NULL | S3 etag |
| version_id | string | yes | NULL | S3 versioning |
| checksum_sha256 | string | yes | NULL | |
| visibility | enum | no | 'private' | |
| storage_status | enum | no | 'uploaded' | pending/uploaded/deleted |
| public_url | string | yes | NULL | |
| uploaded_at | datetime | yes | auto | |
| deleted_at | datetime | yes | NULL | Soft delete |
| metadata_json | string | yes | NULL | |
| last_error | string | yes | NULL | |
| created_at | datetime | yes | auto | |
| updated_at | datetime | yes | auto | |
| user_id | string | yes | NULL | |

⚠️ **Bug:** bucket_name has unique constraint — all files share 1 bucket. Workaround: use object_key as identifier.

---

## 6. storage_file_events

Audit log for file operations.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | |
| storage_file_id | integer | yes | NULL | FK → storage_files.id (SET NULL) |
| event_type | enum | no | — | upload/download/delete/process |
| event_status | enum | no | — | started/completed/failed |
| request_id | string | yes | NULL | Correlation ID |
| details_json | string | yes | NULL | |
| error_message | string | yes | NULL | |
| duration_ms | integer | yes | NULL | |
| created_at | datetime | yes | auto | |
| user_id | string | yes | NULL | |

---

## 7. transcriptions

Core table — audio/video transcription records.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | |
| app_user_id | integer | no | — | |
| project_id | integer | yes | NULL | FK → projects.id (SET NULL) |
| storage_path | string | yes | NULL | S3 key for audio |
| storage_url | string | yes | NULL | |
| original_filename | string | yes | NULL | |
| mime_type | string | yes | NULL | |
| file_size_bytes | integer | yes | NULL | |
| duration_seconds | number | yes | NULL | Audio length |
| language | string | yes | NULL | Requested language |
| enable_diarization | integer | yes | 0 | |
| num_speakers | integer | yes | NULL | Detected speakers |
| **status** | **enum** | **no** | **'uploaded'** | **uploaded/transcribing/completed/failed** ¹ |
| transcript_text | string | yes | NULL | **Preview only** (first 500 chars, indexed) |
| transcript_segments_json | string | yes | NULL | **Legacy — always NULL** (data in S3) |
| **transcript_text_url** | **string** | **yes** | **NULL** | **🆕 S3 key**: `{ws}/transcripts/{id}/full_text.txt` |
| **transcript_json_url** | **string** | **yes** | **NULL** | **🆕 S3 key**: `{ws}/transcripts/{id}/transcript.json` |
| **srt_url** | **string** | **yes** | **NULL** | **🆕 S3 key**: `{ws}/transcripts/{id}/captions.srt` |
| detected_language | string | yes | NULL | |
| salad_job_id | string | yes | NULL | Salad API job ID |
| salad_mode | string | yes | 'full' | full or lite |
| srt_content | string | yes | NULL | **Legacy — always NULL** (data in S3) |
| summary | string | yes | NULL | AI-generated summary |
| processing_time_seconds | number | yes | NULL | |
| word_count | integer | yes | NULL | |
| rag_synced | integer | yes | 0 | 1 = sent to RAG |
| **rag_status** | **string** | **yes** | **'none'** | **🆕** none/pending/syncing/synced/error |
| **rag_synced_at** | **datetime** | **yes** | **NULL** | **🆕 Last RAG sync** |
| storage_file_id | integer | yes | NULL | FK → storage_files.id (SET NULL) |
| transcript_file_id | integer | yes | NULL | FK → storage_files.id (SET NULL) |
| rag_base_id | integer | yes | NULL | FK → rag_bases.id (SET NULL) |
| sentiment | string | yes | NULL | |
| topics_json | string | yes | '[]' | |
| error_message | string | yes | NULL | |
| metadata_json | string | yes | NULL | |
| deleted_at | datetime | yes | NULL | **Soft delete** |
| **source_type** | **string** | **yes** | **'upload'** | **🆕 Origin**: upload/youtube_url/external_url/voice |
| created_at | datetime | yes | auto | |
| updated_at | datetime | yes | auto | |
| user_id | string | yes | NULL | |

¹ NCB enum includes legacy values for backward compatibility: `uploaded, transcribing, completed, failed, pending, processing, error`. Code uses only: `uploaded → transcribing → completed | failed`.

---

## 8. projects

Organize transcriptions into projects.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | FK → workspaces.id |
| owner_user_id | integer | no | — | FK → app_users.id |
| name | string | no | — | |
| description | string | yes | NULL | |
| color | string | yes | NULL | UI color |
| icon | string | yes | NULL | UI icon |
| is_archived | integer | yes | 0 | |
| metadata_json | string | yes | NULL | |
| created_at | datetime | yes | auto | |
| updated_at | datetime | yes | auto | |
| user_id | string | yes | NULL | |

---

## 9. tags / transcription_tags

Tag system for categorizing transcriptions.

**tags:**
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | integer | auto | PK |
| workspace_id | integer | — | ⚠️ unique (bug) |
| name | string | — | ⚠️ unique (bug) |
| color | string | NULL | |
| created_at | datetime | auto | |

**transcription_tags:**
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | integer | auto | PK |
| transcription_id | integer | — | ⚠️ unique (bug) |
| tag_id | integer | — | ⚠️ unique (bug) |
| created_at | datetime | auto | |

⚠️ Both have individual unique instead of composite.

---

## 10. conversations

AI chat sessions. Supports soft delete.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | FK → workspaces.id |
| owner_user_id | integer | no | — | FK → app_users.id |
| agent_id | integer | yes | NULL | FK → rag_agents.id |
| title | string | yes | NULL | |
| description | string | yes | NULL | |
| provider | string | yes | 'straico' | |
| model_id | string | yes | NULL | LLM model identifier |
| temperature | number | yes | NULL | |
| max_tokens | integer | yes | NULL | |
| system_prompt | string | yes | NULL | |
| context_type | string | yes | NULL | 'transcription'/'project'/etc. |
| context_ref_id | string | yes | NULL | ID of context source |
| is_archived | integer | yes | 0 | |
| is_pinned | integer | yes | 0 | |
| metadata_json | string | yes | '{}' | |
| deleted_at | datetime | yes | NULL | **Soft delete** |
| created_at | datetime | yes | NULL | |
| updated_at | datetime | yes | NULL | |
| user_id | string | yes | NULL | FK → ncba_user.id |

---

## 11. messages

Chat messages within conversations.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| conversation_id | integer | no | — | FK → conversations.id (**CASCADE**) |
| parent_message_id | integer | yes | NULL | FK → messages.id (SET NULL) |
| role | enum | no | 'user' | user/assistant/system/tool |
| content_text | string | yes | NULL | |
| content_json | string | yes | NULL | Structured content |
| rag_references_json | string | yes | NULL | RAG source citations (v4 format) |
| model_id | integer | yes | NULL | |
| finish_reason | string | yes | NULL | stop/length/etc. |
| is_error | integer | yes | 0 | |
| error_details_json | string | yes | NULL | |
| metadata_json | string | yes | NULL | |
| created_at | datetime | yes | auto | **indexed** |
| updated_at | datetime | yes | auto | |
| user_id | string | yes | NULL | |

### v4 rag_references_json format

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

---

## 12. message_attachments

Files attached to chat messages.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| message_id | integer | no | — | FK → messages.id (**CASCADE**) |
| attachment_type | enum | no | — | file/image/youtube/audio/video |
| source | enum | no | 'local' | local/external/straico/storage |
| original_name | string | yes | NULL | |
| mime_type | string | yes | NULL | |
| file_size_bytes | integer | yes | NULL | |
| local_url | string | yes | NULL | |
| external_url | string | yes | NULL | |
| straico_file_url | string | yes | NULL | |
| metadata_json | string | yes | NULL | |
| created_at | datetime | yes | auto | |
| user_id | string | yes | NULL | |

---

## 13. rag_bases

Straico RAG knowledge bases. **v4: one per transcription** (not per workspace).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | FK → workspaces.id |
| owner_user_id | integer | no | — | FK → app_users.id |
| straico_rag_id | string | yes | NULL | Straico API RAG ID (**unique**) |
| name | string | no | — | = transcription filename |
| description | string | yes | NULL | |
| status | enum | yes | 'pending' | pending/processing/active/error/deleted |
| files_json | string | yes | '[]' | Files in this RAG base |
| chunking_config_json | string | yes | '{}' | |
| coins_spent | number | yes | NULL | |
| last_synced_at | datetime | yes | NULL | |
| metadata_json | string | yes | '{}' | |
| deleted_at | datetime | yes | NULL | **Soft delete** |
| created_at | datetime | yes | NULL | |
| updated_at | datetime | yes | NULL | |
| user_id | string | yes | NULL | FK → ncba_user.id |

---

## 14. rag_agents

AI agents that combine RAG bases with model settings. **v4: one per workspace.**

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | FK → workspaces.id |
| owner_user_id | integer | no | — | FK → app_users.id |
| straico_agent_id | string | yes | NULL | **unique** |
| name | string | no | — | |
| description | string | yes | NULL | |
| tags_json | string | yes | '[]' | |
| default_model_id | string | yes | NULL | |
| default_temperature | number | yes | NULL | |
| is_shared | integer | yes | 0 | Shared across workspace |
| status | enum | yes | 'active' | active/inactive/error/deleted |
| last_synced_at | datetime | yes | NULL | |
| metadata_json | string | yes | '{}' | |
| created_at | datetime | yes | NULL | |
| updated_at | datetime | yes | NULL | |
| user_id | string | yes | NULL | FK → ncba_user.id |

---

## 15. agent_rag_links

Many-to-many: agents ↔ rag_bases.

| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK |
| workspace_id | integer | FK → workspaces |
| agent_id | integer | FK → rag_agents ⚠️ unique |
| rag_base_id | integer | FK → rag_bases ⚠️ unique |
| added_by | integer | FK → app_users |
| added_at | datetime | |
| user_id | string | FK → ncba_user |

⚠️ Individual unique constraints prevent multiple links per agent or rag_base.

---

## 16. agent_access

Access control: which users can use which agents.

| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK |
| workspace_id | integer | FK → workspaces |
| agent_id | integer | FK → rag_agents ⚠️ unique |
| grantee_user_id | integer | FK → app_users ⚠️ unique |
| granted_by | integer | FK → app_users |
| can_use | integer | default 1 |
| expires_at | datetime | |
| created_at | datetime | |
| user_id | string | FK → ncba_user |

---

## 17. straico_accounts

Per-workspace Straico API credentials (encrypted).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | **unique** (1 per workspace) |
| api_key_encrypted | string | no | — | |
| api_key_last4 | string | yes | NULL | |
| status | enum | yes | 'active' | |
| straico_user_id | string | yes | NULL | |
| straico_first_name | string | yes | NULL | |
| straico_last_name | string | yes | NULL | |
| straico_email | string | yes | NULL | |
| straico_coins | number | yes | NULL | Synced balance |
| straico_plan | string | yes | NULL | |
| last_user_sync_at | datetime | yes | NULL | |
| metadata_json | string | yes | '{}' | |
| created_at | datetime | yes | NULL | |
| updated_at | datetime | yes | NULL | |
| user_id | string | yes | NULL | FK → ncba_user |

---

## 18. salad_accounts

Per-workspace Salad API credentials (encrypted).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | **unique** (1 per workspace) |
| api_key_encrypted | string | no | — | |
| api_key_last4 | string | yes | NULL | |
| org_name | string | no | — | Salad organization name |
| subscription_plan | string | yes | NULL | |
| subscription_hours | integer | yes | 250 | Monthly hours |
| status | enum | yes | 'active' | |
| last_synced_at | datetime | yes | NULL | |
| metadata_json | string | yes | '{}' | |
| created_at | datetime | yes | auto | |
| updated_at | datetime | yes | auto | |
| user_id | string | yes | NULL | FK → ncba_user |

---

## 19. straico_requests

Every Straico API call is logged.

| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK |
| workspace_id | integer | |
| app_user_id | integer | nullable |
| straico_account_id | integer | nullable |
| conversation_id | integer | nullable |
| message_id | integer | nullable |
| agent_id | integer | nullable |
| rag_base_id | integer | nullable |
| request_type | string | 'chat'/'rag_prompt'/'rag_create'/etc. |
| endpoint | string | API endpoint called |
| api_version | string | default 'v1' |
| model_id | string | nullable |
| smart_llm_selector | string | nullable |
| multi_model | integer | default 0 |
| request_payload_json | string | nullable |
| response_payload_json | string | nullable |
| http_status | integer | nullable |
| external_request_id | string | nullable |
| status | enum | pending/completed/failed |
| error_message | string | nullable |
| started_at | datetime | **indexed** |
| finished_at | datetime | nullable |
| created_at | datetime | |
| updated_at | datetime | |
| user_id | string | |

---

## 20. straico_outputs

Response data per model (supports multi-model).

| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK |
| request_id | integer | FK → straico_requests (**CASCADE**) |
| model_id | string | |
| provider | string | |
| output_index | integer | default 0 |
| output_type | enum | text/image/audio |
| role | string | 'assistant' |
| text_content | string | |
| json_content | string | |
| finish_reason | string | |
| refusal | string | |
| created_at | datetime | |
| user_id | string | |

---

## 21. straico_usage

Token/coin tracking per request+output.

| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK |
| request_id | integer | FK → straico_requests (**CASCADE**) |
| output_id | integer | nullable |
| workspace_id | integer | |
| app_user_id | integer | nullable |
| model_id | string | |
| provider | string | |
| prompt_tokens | integer | |
| completion_tokens | integer | |
| total_tokens | integer | |
| input_words | integer | |
| output_words | integer | |
| total_words | integer | |
| input_coins | number | |
| output_coins | number | |
| total_coins | number | |
| created_at | datetime | **indexed** |
| user_id | string | |

---

## 22. straico_models

Cache of available Straico models.

| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK |
| name | string | Model name |
| owned_by | string | Provider |
| model_type | enum | 'chat'/'image'/'audio' |
| word_limit | integer | Input limit |
| max_output | integer | Output limit |
| pricing_json | string | Cost per word/token |
| is_active | integer | default 1 |
| fetched_at | datetime | Last sync time |

---

## 23. generated_assets

AI-generated images/audio/video.

| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK |
| request_id | integer | FK → straico_requests |
| output_id | integer | nullable |
| workspace_id | integer | |
| app_user_id | integer | nullable |
| asset_type | enum | image/video/audio/zip |
| url | string | |
| size_variant | string | |
| duration_seconds | integer | |
| file_size_bytes | integer | |
| prompt_used | string | |
| model_used | string | |
| metadata_json | string | |
| created_at | datetime | |

---

## 24. usage_log

Generic usage tracking.

| Column | Type | Notes |
|--------|------|-------|
| id | integer | PK |
| workspace_id | integer | |
| app_user_id | integer | nullable |
| usage_type | enum | transcription/rag_query/chat/storage |
| units | number | Quantity used |
| unit_label | string | 'minutes'/'coins'/'bytes' |
| ref_type | string | nullable |
| ref_id | integer | nullable |
| description | string | |
| created_at | datetime | **indexed** |

---

## 25. presets

Saved transcription configurations. Users can save and reuse settings across transcription, translation, summary, and YouTube workflows. Supports public (workspace-wide) and private presets.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | integer | no | auto | PK |
| workspace_id | integer | no | — | FK → workspaces.id |
| app_user_id | integer | no | — | FK → app_users.id (creator) |
| title | string | no | — | Preset name |
| description | string | yes | NULL | |
| category | string | yes | 'transcription' | transcription/translation/summary/youtube (**indexed**) |
| is_public | integer | yes | 0 | 1 = visible to all workspace members (**indexed**) |
| transcription_type | string | yes | 'full' | full/lite (Salad mode) |
| config_json | string | yes | '{}' | Full settings: language, diarization, num_speakers, etc. |
| is_active | integer | yes | 1 | |
| created_at | datetime | yes | auto | |
| updated_at | datetime | yes | auto | |
| user_id | string | yes | NULL | FK → ncba_user.id |

**FKs:** workspace_id → workspaces.id, app_user_id → app_users.id, user_id → ncba_user.id (all RESTRICT on delete).

**config_json example:**
```json
{
  "language": "uk",
  "enable_diarization": true,
  "num_speakers": 2,
  "salad_mode": "full",
  "summarize": true,
  "summary_prompt": "Summarize in 3 bullet points"
}
```

---

## Pipeline State Machine (v4)

```
transcriptions.status:    uploaded → transcribing → completed | failed
transcriptions.rag_status: none → pending → syncing → synced | error

UI composite status:
  uploaded                         → "Uploaded"         (gray)
  transcribing                     → "Transcribing..."  (blue spinner)
  completed + rag_status=none      → "Ready"            (green)
  completed + rag_status=pending   → "Indexing queued"  (yellow)
  completed + rag_status=syncing   → "Indexing..."      (blue)
  completed + rag_status=synced    → "Indexed ✅"       (green)
  completed + rag_status=error     → "Index error ⚠️"   (orange)
  failed                           → "Failed ❌"        (red)
```

---

## RAG Architecture (v4)

```
Workspace (straico_agent_id)
  └── Agent (rag_agents)
      ├── rag_bases[0] ← transcription #1 (rag_input.txt)
      ├── rag_bases[1] ← transcription #2 (rag_input.txt)
      └── rag_bases[2] ← transcription #3 (rag_input.txt)

agent_rag_links: agent_id → rag_base_id (one link per transcription)
```

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

---

## FK Cascade Summary

| FK | On Delete | Reason |
|----|-----------|--------|
| messages → conversations | CASCADE | Delete conversation = delete all messages |
| message_attachments → messages | CASCADE | Delete message = delete attachments |
| straico_outputs → straico_requests | CASCADE | Delete request = delete outputs |
| straico_usage → straico_requests | CASCADE | Delete request = delete usage |
| storage_files → storage_backends | SET NULL | Backend removed, file record stays |
| storage_file_events → storage_files | SET NULL | File deleted, event stays for audit |
| transcriptions → projects | SET NULL | Project removed, transcription stays |
| transcriptions → storage_files | SET NULL | File deleted, transcription stays |
| transcriptions → rag_bases | SET NULL | RAG base removed, transcription stays |
| All other FKs | RESTRICT | Prevent deletion of referenced records |

---

## Soft Delete Tables

- `conversations` — `deleted_at`
- `rag_bases` — `deleted_at`
- `transcriptions` — `deleted_at`

Code must filter `WHERE deleted_at IS NULL` on all reads.

---

## Known Issues (NCB Limitations)

| Table | Column | Issue | Workaround |
|-------|--------|-------|------------|
| organization_members | workspace_id | unique (should be composite) | Check before insert |
| organization_members | app_user_id | unique (should be composite) | Check before insert |
| agent_rag_links | agent_id | unique (should be composite) | 1 agent = 1 RAG base only |
| agent_rag_links | rag_base_id | unique (should be composite) | 1 RAG base = 1 agent only |
| agent_access | agent_id | unique (should be composite) | 1 agent = 1 user access only |
| agent_access | grantee_user_id | unique (should be composite) | 1 user = 1 agent only |
| tags | workspace_id | unique (should be composite) | 1 tag per workspace |
| tags | name | unique globally | Tag names unique across ALL workspaces |
| transcription_tags | transcription_id | unique (should be composite) | 1 transcription = 1 tag only |
| transcription_tags | tag_id | unique (should be composite) | 1 tag = 1 transcription only |
| storage_files | bucket_name | unique (should allow duplicates) | Skip bucket_name or use object_key |

---

## Enum Values (v4 FINAL)

| Table | Column | Values |
|-------|--------|--------|
| workspaces | plan | `free`, `pro`, `enterprise` |
| workspaces | status | `active`, `suspended` |
| app_users | role | `owner`, `admin`, `member`, `viewer` |
| organization_members | member_role | `owner`, `admin`, `member`, `viewer` |
| organization_members | status | `active`, `invited`, `suspended` |
| **transcriptions** | **status** | **`uploaded`, `transcribing`, `completed`, `failed`** ¹ |
| **transcriptions** | **rag_status** | **`none`, `pending`, `syncing`, `synced`, `error`** |
| **transcriptions** | **source_type** | **`upload`, `youtube_url`, `external_url`, `voice`** |
| messages | role | `system`, `user`, `assistant`, `tool` |
| message_attachments | attachment_type | `file`, `image`, `youtube`, `audio`, `video` |
| message_attachments | source | `local`, `straico`, `external`, `storage` |
| generated_assets | asset_type | `image`, `video`, `audio`, `zip` |
| presets | category | `transcription`, `translation`, `summary`, `youtube` |
| rag_agents | status | `active`, `inactive`, `error`, `deleted` |
| rag_bases | status | `pending`, `processing`, `active`, `error`, `deleted` |
| storage_files | storage_status | `pending`, `uploaded`, `deleted` |
| straico_requests | status | `pending`, `completed`, `failed` |
| usage_log | usage_type | `transcription`, `rag_query`, `chat`, `storage` |

¹ NCB enum also includes `pending`, `processing`, `error` for backward compatibility.

---

## NCB System Tables (managed, do not modify)

- `ncba_user` — auth users (id=string UUID, email unique)
- `ncba_account` — OAuth accounts
- `ncba_session` — auth sessions (token unique)
- `ncba_verification` — email verification codes
- `ncba_config` — auth provider config
- `ncba_rls_config` — row-level security policies

---

## Data Flow (v4)

```
Upload:   presign → S3 PUT → complete → status='transcribing' → Salad
Webhook:  Salad callback → artifacts to S3 → S3 keys to NCB → status='completed'
RAG:      auto-sync → rag_status='syncing' → Straico RAG → rag_status='synced'
Chat:     question → Straico agent (queries all linked RAG bases) → answer + references
Delete:   soft-delete tx + S3 cleanup + Straico RAG delete
Usage:    every operation → workspaces counters + usage_log
```
