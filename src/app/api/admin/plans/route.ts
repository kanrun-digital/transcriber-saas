import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

const PLAN_DEFAULTS: Record<string, any> = {
  free: {
    salad_minutes_limit: 60,
    straico_coins_limit: 1000,
    max_transcriptions: 5,
    max_file_size_mb: 100,
    max_storage_gb: 1,
    max_rag_bases: 1,
    max_agents: 0,
    max_members: 1,
  },
  pro: {
    salad_minutes_limit: 500,
    straico_coins_limit: 10000,
    max_transcriptions: 1000,
    max_file_size_mb: 3000,
    max_storage_gb: 50,
    max_rag_bases: 10,
    max_agents: 3,
    max_members: 5,
  },
  enterprise: {
    salad_minutes_limit: 15000,
    straico_coins_limit: 100000,
    max_transcriptions: 99999,
    max_file_size_mb: 5000,
    max_storage_gb: 500,
    max_rag_bases: 100,
    max_agents: 50,
    max_members: 100,
  },
};

/**
 * POST /api/admin/plans
 * 
 * Actions:
 * - "set-plan": Change workspace plan + apply limits { workspaceId, plan }
 * - "start-trial": Start Pro trial { workspaceId, trialDays? }
 * - "check-trials": Check and downgrade expired trials (cron job)
 * - "get-plans": Get all plan definitions
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { action } = body;

    if (action === "get-plans") {
      return NextResponse.json({ plans: PLAN_DEFAULTS });
    }

    if (action === "set-plan") {
      const { workspaceId, plan } = body;
      if (!workspaceId || !plan) {
        return NextResponse.json({ error: "workspaceId and plan required" }, { status: 400 });
      }
      const limits = PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.free;
      await ncb.update("workspaces", workspaceId, {
        plan,
        ...limits,
        updated_at: now(),
      });
      return NextResponse.json({ ok: true, plan, limits });
    }

    if (action === "start-trial") {
      const { workspaceId, trialDays } = body;
      const days = trialDays || 14;
      const trialEnd = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

      // Get current workspace
      const ws = await ncb.readOne<any>("workspaces", workspaceId);
      if (!ws) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

      // Set Pro limits + trial metadata
      const existingMeta = ws.metadata_json
        ? (typeof ws.metadata_json === "string" ? JSON.parse(ws.metadata_json) : ws.metadata_json)
        : {};

      const newMeta = {
        ...existingMeta,
        trial_started: now(),
        trial_ends: trialEnd.toISOString().slice(0, 19).replace("T", " "),
        original_plan: ws.plan || "free",
      };

      await ncb.update("workspaces", workspaceId, {
        plan: "pro",
        ...PLAN_DEFAULTS.pro,
        metadata_json: JSON.stringify(newMeta),
        updated_at: now(),
      });

      return NextResponse.json({
        ok: true,
        trialEnds: newMeta.trial_ends,
        message: `Pro тріал на ${days} днів активовано`,
      });
    }

    if (action === "check-trials") {
      // Check all workspaces with active trials
      const allWs = await ncb.read<any>("workspaces", { limit: 500 });
      const workspaces = allWs.data || [];
      let expired = 0;

      for (const ws of workspaces) {
        try {
          const meta = ws.metadata_json
            ? (typeof ws.metadata_json === "string" ? JSON.parse(ws.metadata_json) : ws.metadata_json)
            : {};

          if (meta.trial_ends) {
            const trialEnd = new Date(meta.trial_ends);
            if (trialEnd < new Date()) {
              // Trial expired — downgrade
              const originalPlan = meta.original_plan || "free";
              const limits = PLAN_DEFAULTS[originalPlan] || PLAN_DEFAULTS.free;
              const newMeta = { ...meta };
              delete newMeta.trial_started;
              delete newMeta.trial_ends;
              delete newMeta.original_plan;
              newMeta.trial_expired = now();

              await ncb.update("workspaces", ws.id, {
                plan: originalPlan,
                ...limits,
                metadata_json: JSON.stringify(newMeta),
                updated_at: now(),
              });
              expired++;
            }
          }
        } catch {}
      }

      return NextResponse.json({ ok: true, expired, checked: workspaces.length });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
