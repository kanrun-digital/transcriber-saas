/**
 * Usage & Limits Service (Schema v3)
 * 
 * Tracks limits in workspaces table + logs to usage_log table.
 * Detailed Straico tracking in straico_requests → straico_usage.
 * Supports soft deletes on transcriptions, conversations, rag_bases.
 */

import * as ncb from "./ncb";

// ============ Types ============

export interface WorkspaceLimits {
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
  default_salad_mode: string;
  default_model_id: string | null;
  is_active: boolean;
}

export interface UsageCheck {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  used?: number;
  limit?: number;
}

// ============ Get Limits ============

export async function getWorkspaceLimits(workspaceId: number): Promise<WorkspaceLimits | null> {
  const ws = await ncb.readOne<any>("workspaces", workspaceId);
  if (!ws) return null;

  const limits: WorkspaceLimits = {
    salad_minutes_limit: ws.salad_minutes_limit ?? 0,
    salad_minutes_used: ws.salad_minutes_used ?? 0,
    straico_coins_limit: ws.straico_coins_limit ?? 0,
    straico_coins_used: ws.straico_coins_used ?? 0,
    billing_period_start: ws.billing_period_start || null,
    max_file_size_mb: ws.max_file_size_mb ?? 500,
    max_storage_gb: ws.max_storage_gb ?? 10,
    storage_used_bytes: ws.storage_used_bytes ?? 0,
    max_rag_bases: ws.max_rag_bases ?? 3,
    max_agents: ws.max_agents ?? 1,
    max_members: ws.max_members ?? 5,
    max_transcriptions: ws.max_transcriptions ?? 100,
    default_salad_mode: ws.default_salad_mode || "full",
    default_model_id: ws.default_model_id || null,
    is_active: ws.status === "active",
  };

  // Auto-reset if new billing period
  if (limits.billing_period_start) {
    const periodStart = new Date(limits.billing_period_start);
    const now = new Date();
    const monthsDiff =
      (now.getFullYear() - periodStart.getFullYear()) * 12 +
      (now.getMonth() - periodStart.getMonth());

    if (monthsDiff >= 1) {
      const newPeriod = now.toISOString().slice(0, 10) + " 00:00:00";
      await ncb.update("workspaces", workspaceId, {
        salad_minutes_used: 0,
        straico_coins_used: 0,
        billing_period_start: newPeriod,
      });
      limits.salad_minutes_used = 0;
      limits.straico_coins_used = 0;
      limits.billing_period_start = newPeriod;
      console.log(`[Usage] Reset counters for workspace ${workspaceId}`);
    }
  }

  return limits;
}

// ============ Check Limits ============

export async function checkTranscriptionLimit(
  workspaceId: number,
  estimatedMinutes = 0
): Promise<UsageCheck> {
  const limits = await getWorkspaceLimits(workspaceId);
  if (!limits) return { allowed: false, reason: "Workspace not found" };
  if (!limits.is_active) return { allowed: false, reason: "Workspace deactivated" };

  // Check total transcriptions count
  const txCount = await ncb.search("transcriptions", {
    workspace_id: workspaceId,
    // NCB doesn't support IS NULL filter easily, so we count all and filter
  });
  const activeCount = txCount.filter((t: any) => !t.deleted_at).length;
  if (activeCount >= limits.max_transcriptions) {
    return { allowed: false, reason: `Max transcriptions reached (${limits.max_transcriptions})` };
  }

  // Check minutes
  if (limits.salad_minutes_limit === 0) {
    return { allowed: false, reason: "No transcription minutes allocated" };
  }

  const remaining = limits.salad_minutes_limit - limits.salad_minutes_used;
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Monthly limit reached (${limits.salad_minutes_limit} min)`,
      remaining: 0, used: limits.salad_minutes_used, limit: limits.salad_minutes_limit,
    };
  }

  return { allowed: true, remaining, used: limits.salad_minutes_used, limit: limits.salad_minutes_limit };
}

export async function checkStraicoLimit(workspaceId: number): Promise<UsageCheck> {
  const limits = await getWorkspaceLimits(workspaceId);
  if (!limits) return { allowed: false, reason: "Workspace not found" };
  if (!limits.is_active) return { allowed: false, reason: "Workspace deactivated" };
  if (limits.straico_coins_limit === 0) {
    return { allowed: false, reason: "No AI credits allocated" };
  }

  const remaining = limits.straico_coins_limit - limits.straico_coins_used;
  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Monthly AI limit reached (${limits.straico_coins_limit} coins)`,
      remaining: 0, used: limits.straico_coins_used, limit: limits.straico_coins_limit,
    };
  }

  return { allowed: true, remaining, used: limits.straico_coins_used, limit: limits.straico_coins_limit };
}

export async function checkStorageLimit(workspaceId: number, fileSizeBytes: number): Promise<UsageCheck> {
  const limits = await getWorkspaceLimits(workspaceId);
  if (!limits) return { allowed: false, reason: "Workspace not found" };

  const maxBytes = limits.max_storage_gb * 1024 * 1024 * 1024;
  const afterUpload = limits.storage_used_bytes + fileSizeBytes;

  if (afterUpload > maxBytes) {
    return {
      allowed: false,
      reason: `Storage limit reached (${limits.max_storage_gb} GB)`,
      remaining: Math.max(0, maxBytes - limits.storage_used_bytes),
      used: limits.storage_used_bytes,
      limit: maxBytes,
    };
  }

  return { allowed: true, remaining: maxBytes - afterUpload };
}

export async function checkRagBaseLimit(workspaceId: number): Promise<UsageCheck> {
  const limits = await getWorkspaceLimits(workspaceId);
  if (!limits) return { allowed: false, reason: "Workspace not found" };

  const rags = await ncb.search("rag_bases", { workspace_id: workspaceId });
  const activeCount = rags.filter((r: any) => !r.deleted_at).length;

  if (activeCount >= limits.max_rag_bases) {
    return { allowed: false, reason: `Max RAG bases reached (${limits.max_rag_bases})` };
  }
  return { allowed: true, remaining: limits.max_rag_bases - activeCount };
}

export async function checkAgentLimit(workspaceId: number): Promise<UsageCheck> {
  const limits = await getWorkspaceLimits(workspaceId);
  if (!limits) return { allowed: false, reason: "Workspace not found" };

  const agents = await ncb.search("rag_agents", { workspace_id: workspaceId });
  if (agents.length >= limits.max_agents) {
    return { allowed: false, reason: `Max agents reached (${limits.max_agents})` };
  }
  return { allowed: true, remaining: limits.max_agents - agents.length };
}

export async function checkMemberLimit(workspaceId: number): Promise<UsageCheck> {
  const limits = await getWorkspaceLimits(workspaceId);
  if (!limits) return { allowed: false, reason: "Workspace not found" };

  const members = await ncb.search("organization_members", { workspace_id: workspaceId });
  if (members.length >= limits.max_members) {
    return { allowed: false, reason: `Max members reached (${limits.max_members})` };
  }
  return { allowed: true, remaining: limits.max_members - members.length };
}

// ============ Record Usage ============

export async function recordTranscriptionUsage(
  workspaceId: number,
  appUserId: number | null,
  durationSeconds: number,
  transcriptionId: number
): Promise<void> {
  const minutes = Math.round((durationSeconds / 60) * 100) / 100;

  const limits = await getWorkspaceLimits(workspaceId);
  if (limits) {
    await ncb.update("workspaces", workspaceId, {
      salad_minutes_used: Math.round((limits.salad_minutes_used + minutes) * 100) / 100,
    });
  }

  await ncb.create("usage_log", {
    workspace_id: workspaceId,
    app_user_id: appUserId,
    usage_type: "transcription",
    units: minutes,
    unit_label: "minutes",
    ref_type: "transcription",
    ref_id: transcriptionId,
    description: `Transcription: ${minutes} min`,
  });
}

export async function recordStraicoUsage(
  workspaceId: number,
  appUserId: number | null,
  coins: number,
  usageType: "rag_query" | "chat" | "rag_create" = "rag_query",
  refId?: number
): Promise<void> {
  const limits = await getWorkspaceLimits(workspaceId);
  if (limits) {
    await ncb.update("workspaces", workspaceId, {
      straico_coins_used: Math.round((limits.straico_coins_used + coins) * 100) / 100,
    });
  }

  await ncb.create("usage_log", {
    workspace_id: workspaceId,
    app_user_id: appUserId,
    usage_type: usageType,
    units: coins,
    unit_label: "coins",
    ref_type: usageType === "rag_query" ? "conversation" : null,
    ref_id: refId || null,
    description: `${usageType}: ${coins} coins`,
  });
}

export async function recordStorageUsage(workspaceId: number, fileSizeBytes: number): Promise<void> {
  const limits = await getWorkspaceLimits(workspaceId);
  if (limits) {
    await ncb.update("workspaces", workspaceId, {
      storage_used_bytes: limits.storage_used_bytes + fileSizeBytes,
    });
  }
}

export async function releaseStorageUsage(workspaceId: number, fileSizeBytes: number): Promise<void> {
  const limits = await getWorkspaceLimits(workspaceId);
  if (limits) {
    await ncb.update("workspaces", workspaceId, {
      storage_used_bytes: Math.max(0, limits.storage_used_bytes - fileSizeBytes),
    });
  }
}

// ============ Dashboard ============

export async function getUsageSummary(workspaceId: number) {
  const limits = await getWorkspaceLimits(workspaceId);
  if (!limits) return null;

  const txRem = Math.max(0, limits.salad_minutes_limit - limits.salad_minutes_used);
  const aiRem = Math.max(0, limits.straico_coins_limit - limits.straico_coins_used);
  const storageMaxBytes = limits.max_storage_gb * 1024 * 1024 * 1024;

  return {
    transcription: {
      used: limits.salad_minutes_used,
      limit: limits.salad_minutes_limit,
      remaining: txRem,
      percent: limits.salad_minutes_limit > 0
        ? Math.round((limits.salad_minutes_used / limits.salad_minutes_limit) * 100) : 0,
    },
    ai: {
      used: limits.straico_coins_used,
      limit: limits.straico_coins_limit,
      remaining: aiRem,
      percent: limits.straico_coins_limit > 0
        ? Math.round((limits.straico_coins_used / limits.straico_coins_limit) * 100) : 0,
    },
    storage: {
      usedBytes: limits.storage_used_bytes,
      usedGb: Math.round((limits.storage_used_bytes / 1024 / 1024 / 1024) * 100) / 100,
      limitGb: limits.max_storage_gb,
      percent: storageMaxBytes > 0
        ? Math.round((limits.storage_used_bytes / storageMaxBytes) * 100) : 0,
    },
    quotas: {
      ragBases: limits.max_rag_bases,
      agents: limits.max_agents,
      members: limits.max_members,
      transcriptions: limits.max_transcriptions,
    },
    defaults: {
      saladMode: limits.default_salad_mode,
      modelId: limits.default_model_id,
    },
    billingStart: limits.billing_period_start,
    maxFileSizeMb: limits.max_file_size_mb,
    isActive: limits.is_active,
  };
}
