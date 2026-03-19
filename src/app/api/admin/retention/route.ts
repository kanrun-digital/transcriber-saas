import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { deleteFile } from "@/lib/s3";

const RETENTION_DAYS: Record<string, number> = {
  free: 7,
  pro: 90,
  enterprise: 365,
};

function isExpired(createdAt: string, retentionDays: number): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays > retentionDays;
}

/**
 * POST /api/admin/retention
 * Check and delete expired audio files from S3.
 * Keeps transcript text/srt — only deletes source audio.
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const allTx = await ncb.read<any>("transcriptions", {
      filters: { status: "completed" },
      limit: 500,
    });

    const transcriptions = (allTx.data || []).filter((t: any) => t.storage_path && !t.deleted_at);

    // Cache workspace plans
    const planCache = new Map<number, string>();

    let deleted = 0;
    let checked = 0;
    const errors: string[] = [];

    for (const tx of transcriptions) {
      checked++;

      // Get workspace plan
      let plan = "free";
      if (planCache.has(tx.workspace_id)) {
        plan = planCache.get(tx.workspace_id) || "free";
      } else {
        try {
          const ws = await ncb.readOne<any>("workspaces", tx.workspace_id);
          plan = ws?.plan || "free";
          planCache.set(tx.workspace_id, plan);
        } catch {}
      }

      const retentionDays = RETENTION_DAYS[plan] || RETENTION_DAYS.free;

      if (!isExpired(tx.created_at, retentionDays)) continue;

      try {
        await deleteFile(tx.storage_path);
        await ncb.update("transcriptions", tx.id, {
          storage_path: null,
          updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
        });
        deleted++;
      } catch (e: any) {
        errors.push(`TX ${tx.id}: ${e.message}`);
      }
    }

    return NextResponse.json({ ok: true, deleted, checked, errors: errors.length ? errors : undefined });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
