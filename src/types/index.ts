// ============ Enums ============

export type TranscriptionStatus = "uploaded" | "transcribing" | "completed" | "failed";
export type RagStatus = "none" | "pending" | "syncing" | "synced" | "error";
export type SaladMode = "full" | "lite";
export type UserRole = "owner" | "admin" | "member" | "viewer";
export type WorkspacePlan = "free" | "pro" | "enterprise";
export type WorkspaceStatus = "active" | "suspended";
export type RagBaseStatus = "pending" | "processing" | "active" | "error" | "deleted";
export type MessageRole = "user" | "assistant" | "system" | "tool";

// ============ Core ============

export interface Workspace {
  id: number;
  name: string;
  slug: string | null;
  plan: WorkspacePlan;
  status: WorkspaceStatus;
  metadata_json: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  straico_agent_id: string | null;
  active_member_count: number;
  // Limits
  salad_minutes_limit: number;
  salad_minutes_used: number;
  straico_coins_limit: number;
  straico_coins_used: number;
  billing_period_start: string | null;
  max_file_size_mb: number;
  max_storage_gb: number;
  storage_used_bytes: number;
  max_rag_bases: number;
  max_agents: number;
  max_members: number;
  max_transcriptions: number;
  default_salad_mode: SaladMode;
  default_model_id: string | null;
}

export interface AppUser {
  id: number;
  workspace_id: number;
  ncb_user_id: string | null;
  email: string;
  name: string | null;
  role: UserRole;
  is_active: number;
  last_seen_at: string | null;
  metadata_json: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OrganizationMember {
  id: number;
  workspace_id: number;
  app_user_id: number;
  member_role: UserRole;
  status: "active" | "invited" | "suspended";
  invited_by: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// ============ Transcription ============

export interface Transcription {
  id: number;
  workspace_id: number;
  app_user_id: number;
  project_id: number | null;
  storage_path: string | null;
  storage_url: string | null;
  source_type: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  language: string | null;
  enable_diarization: number;
  num_speakers: number | null;
  status: TranscriptionStatus;
  transcript_text: string | null;
  transcript_text_url: string | null;
  transcript_json_url: string | null;
  srt_url: string | null;
  detected_language: string | null;
  salad_job_id: string | null;
  salad_mode: SaladMode;
  srt_content: string | null;
  summary: string | null;
  processing_time_seconds: number | null;
  word_count: number | null;
  rag_synced: number;
  rag_status: RagStatus;
  rag_synced_at: string | null;
  storage_file_id: number | null;
  transcript_file_id: number | null;
  rag_base_id: number | null;
  sentiment: string | null;
  topics_json: string | null;
  error_message: string | null;
  metadata_json: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ============ Presets ============

export interface TranscriptionSettings {
  language: string;
  enableDiarization: boolean;
  saladMode: SaladMode;
  sentenceTimestamps: boolean;
  wordTimestamps: boolean;
  srt: boolean;
  sentenceDiarization: boolean;
  multichannel: boolean;
  returnAsFile: boolean;
  summarize: number;
  translate: string | null;
  customVocabulary: string | null;
  customPrompt: string | null;
  llmTranslation: string | null;
  srtTranslation: string | null;
  overallSentiment: boolean;
  overallClassification: boolean;
}

export interface Preset {
  id: number;
  workspace_id: number;
  app_user_id: number;
  title: string;
  description: string | null;
  category: string | null;
  is_public: number;
  transcription_type: SaladMode;
  config_json: string;
  is_active: number;
  created_at: string | null;
  updated_at: string | null;
}

// ============ Projects ============

export interface Project {
  id: number;
  workspace_id: number;
  owner_user_id: number;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  is_archived: number;
  metadata_json: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ============ RAG ============

export interface RagBase {
  id: number;
  workspace_id: number;
  owner_user_id: number;
  straico_rag_id: string | null;
  name: string;
  description: string | null;
  status: RagBaseStatus;
  files_json: string | null;
  chunking_config_json: string | null;
  coins_spent: number | null;
  last_synced_at: string | null;
  metadata_json: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ============ Chat ============

export interface Conversation {
  id: number;
  workspace_id: number;
  owner_user_id: number;
  agent_id: number | null;
  title: string | null;
  description: string | null;
  provider: string;
  model_id: string | null;
  temperature: number | null;
  max_tokens: number | null;
  system_prompt: string | null;
  context_type: string | null;
  context_ref_id: string | null;
  is_archived: number;
  is_pinned: number;
  metadata_json: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RagReference {
  transcription_id: number;
  rag_base_id: number;
  file_name: string;
  start_seconds: number;
  end_seconds: number;
  speaker: string | null;
  excerpt: string;
  relevance_score: number;
}

export interface Message {
  id: number;
  conversation_id: number;
  parent_message_id: number | null;
  role: MessageRole;
  content_text: string | null;
  content_json: string | null;
  rag_references_json: string | null;
  model_id: number | null;
  finish_reason: string | null;
  is_error: number;
  error_details_json: string | null;
  metadata_json: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ============ Usage ============

export interface UsageSummary {
  transcription: {
    used: number;
    limit: number;
    remaining: number;
    percent: number;
  };
  ai: {
    used: number;
    limit: number;
    remaining: number;
    percent: number;
  };
  storage: {
    usedBytes: number;
    usedGb: number;
    limitGb: number;
    percent: number;
  };
  quotas: {
    ragBases: number;
    agents: number;
    members: number;
    transcriptions: number;
  };
  defaults: {
    saladMode: string;
    modelId: string | null;
  };
  billingStart: string | null;
  maxFileSizeMb: number;
  isActive: boolean;
}

// ============ Upload ============

export interface PresignResponse {
  uploadUrl: string;
  transcriptionId: number;
  storageFileId: number;
  s3Key: string;
  saladMode: SaladMode;
}

export interface UploadCompleteResponse {
  jobId: string;
  status: string;
  message: string;
}

export type UploadPhase = "idle" | "validating" | "presigning" | "uploading" | "completing" | "done" | "error";

export interface UploadState {
  phase: UploadPhase;
  progress: number;
  file: File | null;
  transcriptionId: number | null;
  error: string | null;
}

// ============ Auth ============

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Session {
  user: SessionUser;
}

// ============ Admin ============

export interface AdminStats {
  totalTranscriptions: number;
  completedTranscriptions: number;
  processingTranscriptions: number;
  failedTranscriptions: number;
  totalUsers: number;
  activeUsers: number;
}

export interface AdminTranscription extends Transcription {
  userEmail?: string;
  userName?: string;
}

// ============ API ============

export interface ApiError {
  error: string;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  totalPages?: number;
}

// ============ RAG Query ============

export interface RagQueryRequest {
  workspaceId: number;
  question: string;
  conversationId?: number;
  model?: string;
  ragBaseId?: number;
}

export interface RagQueryResponse {
  answer: string;
  references: RagReference[];
  conversationId: number;
  coinsUsed: number;
}
