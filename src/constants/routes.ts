export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/dashboard",
  UPLOAD: "/upload",
  TRANSCRIPTIONS: "/transcriptions",
  TRANSCRIPTION_DETAIL: (id: number | string) => `/transcriptions/${id}`,
  PRESETS: "/presets",
  PROJECTS: "/projects",
  CHAT: "/chat",
  SETTINGS: "/settings",
  ADMIN: "/admin",
} as const;


export const API_ROUTES = {
  // Auth
  AUTH_SESSION: "/api/auth/session",
  AUTH_SIGN_IN: "/api/auth/sign-in",
  AUTH_SIGN_UP: "/api/auth/sign-up",
  AUTH_SIGN_OUT: "/api/auth/sign-out",
  // Upload
  UPLOAD_PRESIGN: "/api/upload/presign",
  UPLOAD_COMPLETE: "/api/upload/complete",
  // Transcriptions
  TRANSCRIPTIONS: "/api/data/transcriptions",
  TRANSCRIPTION: (id: number | string) => `/api/transcriptions/${id}`,
  TRANSCRIPTION_ARTIFACTS: (id: number | string) => `/api/transcriptions/${id}/artifacts`,
  // RAG
  RAG_QUERY: "/api/rag/query",
  RAG_SYNC: "/api/rag/sync",
  // Data (generic NCB proxy)
  DATA: (table: string) => `/api/data/${table}`,
  DATA_RECORD: (table: string, id: number | string) => `/api/data/${table}/${id}`,
  // Usage
  USAGE: "/api/usage",
  // Admin
  ADMIN_STATS: "/api/admin/stats",
  ADMIN_USERS: "/api/admin/users",
} as const;
