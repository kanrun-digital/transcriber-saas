import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";
import { getTranscriptionJob, deleteTranscriptionJob } from "@/lib/salad";

function now(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * POST /api/transcriptions/[id]/cancel
 * 
 * 1. Check Salad job status first
 * 2. If succeeded — save result and mark completed
 * 3. If failed — mark failed
 * 4. If pending/running — cancel and reset to "uploaded"
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ncb.requireAuth(req);
    const { id } = await params;
    const txId = Number(id);

    const tx = await ncb.readOne<any>("transcriptions", txId);
    if (!tx || tx.deleted_at) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (tx.status !== "transcribing") {
      return NextResponse.json({ error: "Can only cancel transcribing jobs" }, { status: 400 });
    }

    // Check Salad job status first
    if (tx.salad_job_id) {
      try {
        const job = await getTranscriptionJob(tx.salad_job_id, tx.salad_mode || "full");
        const jobStatus = job.status;

        if (jobStatus === "succeeded") {
          // Job actually completed! Save the result
          const output = job.output || {} as any;
          const text = output.text || "";
          const summary = output.summary || null;
          const srt = output.srt || null;
          const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
          const numSpeakers = output.num_speakers || null;
          const detectedLang = output.detected_language || null;

          await ncb.update("transcriptions", txId, {
            status: "completed",
            transcript_text: text.substring(0, 500), // NCB preview
            summary: summary ? summary.substring(0, 500) : null,
            srt_content: srt ? srt.substring(0, 500) : null,
            word_count: wordCount,
            num_speakers: numSpeakers,
            detected_language: detectedLang,
            updated_at: now(),
          });

          return NextResponse.json({
            ok: true,
            action: "completed",
            message: "Транскрипція вже завершена в Salad! Результат збережено.",
          });
        }

        if (jobStatus === "failed") {
          await ncb.update("transcriptions", txId, {
            status: "failed",
            error_message: "Salad job failed",
            updated_at: now(),
          });

          return NextResponse.json({
            ok: true,
            action: "failed",
            message: "Salad job завершився з помилкою.",
          });
        }

        // Still pending/running — cancel it
        try {
          await deleteTranscriptionJob(tx.salad_job_id, tx.salad_mode || "full");
        } catch (e) {
          // Ignore cancel errors
        }

      } catch (saladError: any) {
        // Salad API error — job might not exist anymore, proceed with reset
        console.log(`[Cancel] Salad check failed for job ${tx.salad_job_id}: ${saladError.message}`);
      }
    }

    // Reset to uploaded so user can restart with new settings
    await ncb.update("transcriptions", txId, {
      status: "uploaded",
      salad_job_id: null,
      error_message: null,
      updated_at: now(),
    });

    return NextResponse.json({
      ok: true,
      action: "reset",
      message: "Транскрипцію скасовано. Можна перезапустити з новими налаштуваннями.",
    });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    console.error("[Cancel] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
