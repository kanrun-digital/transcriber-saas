import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

/**
 * POST /api/admin/cleanup-presets
 * 
 * Removes duplicate presets (keeps v3 versions, deletes old v2 duplicates).
 * Matches by similar title — if two presets have the same base title, keeps the newer one.
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);

    const allPresets = await ncb.read<any>("presets", {
      filters: { is_public: 1 },
      limit: 100,
    });

    const presets = allPresets.data || [];
    const seen = new Map<string, any>();
    const toDelete: number[] = [];

    // Sort by id desc — newest first
    const sorted = [...presets].sort((a: any, b: any) => b.id - a.id);

    for (const preset of sorted) {
      // Normalize title for comparison
      const normalizedTitle = preset.title
        .replace(/\s*\(.*?\)\s*/g, "") // Remove parenthetical
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      if (seen.has(normalizedTitle)) {
        // This is an older duplicate — mark for deletion
        toDelete.push(preset.id);
      } else {
        seen.set(normalizedTitle, preset);
      }
    }

    // Delete duplicates
    const results: string[] = [];
    for (const id of toDelete) {
      try {
        const preset = presets.find((p: any) => p.id === id);
        await ncb.update("presets", id, { is_active: 0, is_public: 0 });
        results.push(`DEDUP: ${preset?.title} (id:${id})`);
      } catch (e: any) {
        results.push(`ERROR: id:${id} — ${e.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      total: presets.length,
      duplicatesRemoved: toDelete.length,
      remaining: presets.length - toDelete.length,
      results,
    });
  } catch (error: any) {
    console.error("[Cleanup Presets] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
