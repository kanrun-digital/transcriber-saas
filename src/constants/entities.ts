export const TRANSCRIPTION_STATUS = {
  UPLOADED: "uploaded",
  TRANSCRIBING: "transcribing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type TranscriptionStatusValue =
  (typeof TRANSCRIPTION_STATUS)[keyof typeof TRANSCRIPTION_STATUS];

export const RAG_STATUS = {
  NONE: "none",
  PENDING: "pending",
  SYNCING: "syncing",
  SYNCED: "synced",
  ERROR: "error",
} as const;

export type RagStatusValue = (typeof RAG_STATUS)[keyof typeof RAG_STATUS];

export const SALAD_MODE = {
  FULL: "full",
  LITE: "lite",
} as const;

export type SaladModeValue = (typeof SALAD_MODE)[keyof typeof SALAD_MODE];

export const USER_ROLE = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export const WORKSPACE_PLAN = {
  FREE: "free",
  PRO: "pro",
  ENTERPRISE: "enterprise",
} as const;

export const RAG_BASE_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  ACTIVE: "active",
  ERROR: "error",
  DELETED: "deleted",
} as const;

/** Composite UI status for transcription list display */
export function getCompositeStatus(
  status: string,
  ragStatus: string
): {
  label: string;
  color: "gray" | "blue" | "green" | "yellow" | "orange" | "red";
  icon: "upload" | "spinner" | "check" | "queue" | "index" | "warning" | "error";
} {
  if (status === "uploaded") return { label: "Завантажено", color: "gray", icon: "upload" };
  if (status === "transcribing") return { label: "Транскрибування...", color: "blue", icon: "spinner" };
  if (status === "failed") return { label: "Помилка", color: "red", icon: "error" };

  // completed
  switch (ragStatus) {
    case "none":
      return { label: "Готово", color: "green", icon: "check" };
    case "pending":
      return { label: "Індексація в черзі", color: "yellow", icon: "queue" };
    case "syncing":
      return { label: "Індексація...", color: "blue", icon: "spinner" };
    case "synced":
      return { label: "Проіндексовано ✅", color: "green", icon: "check" };
    case "error":
      return { label: "Помилка індексу ⚠️", color: "orange", icon: "warning" };
    default:
      return { label: "Готово", color: "green", icon: "check" };
  }
}
