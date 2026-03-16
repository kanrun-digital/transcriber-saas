/** Default max file size (workspace may override) */
export const MAX_FILE_SIZE_MB = 500;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/** Allowed audio/video MIME types */
export const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/flac",
  "audio/x-flac",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
] as const;

/** Allowed file extensions (fallback for mime detection) */
export const ALLOWED_EXTENSIONS = [
  ".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".webm",
  ".mp4", ".mov", ".avi", ".mkv", ".wma",
] as const;

/** Polling intervals (ms) */
export const TRANSCRIPTION_POLL_INTERVAL = 5000;
export const USAGE_REFETCH_INTERVAL = 60000;

/** Pagination */
export const DASHBOARD_RECENT_LIMIT = 10;
export const TRANSCRIPTIONS_PAGE_SIZE = 20;
export const ADMIN_TABLE_LIMIT = 100;
export const MESSAGES_PAGE_SIZE = 50;

/** Chat */
export const DEFAULT_MAX_TOKENS = 2048;
export const DEFAULT_TEMPERATURE = 0.7;
