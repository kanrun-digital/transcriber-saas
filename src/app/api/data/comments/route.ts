import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

/**
 * Comments stored as JSON array in transcriptions.metadata_json.comments
 * 
 * GET /api/data/comments?transcription_id=X
 * POST /api/data/comments { transcription_id, content, timestamp_ref?, author_name?, author_email? }
 * DELETE /api/data/comments { transcription_id, commentIndex }
 */

async function getComments(transcriptionId: number): Promise<any[]> {
  const tx = await ncb.readOne<any>("transcriptions", transcriptionId);
  if (!tx) return [];
  try {
    const meta = typeof tx.metadata_json === "string" ? JSON.parse(tx.metadata_json || "{}") : (tx.metadata_json || {});
    return Array.isArray(meta.comments) ? meta.comments : [];
  } catch {
    return [];
  }
}

async function saveComments(transcriptionId: number, comments: any[]) {
  const tx = await ncb.readOne<any>("transcriptions", transcriptionId);
  let meta: any = {};
  try {
    meta = typeof tx?.metadata_json === "string" ? JSON.parse(tx.metadata_json || "{}") : (tx?.metadata_json || {});
  } catch {}
  meta.comments = comments;
  await ncb.update("transcriptions", transcriptionId, {
    metadata_json: JSON.stringify(meta),
  });
}

export async function GET(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const transcriptionId = Number(req.nextUrl.searchParams.get("transcription_id") || 0);
    if (!transcriptionId) {
      return NextResponse.json({ error: "transcription_id required" }, { status: 400 });
    }
    const comments = await getComments(transcriptionId);
    return NextResponse.json({ data: comments });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { transcription_id, content, timestamp_ref } = body;

    if (!transcription_id || !content) {
      return NextResponse.json({ error: "transcription_id and content required" }, { status: 400 });
    }

    const comments = await getComments(transcription_id);
    const newComment = {
      id: Date.now(),
      content,
      timestamp_ref: timestamp_ref || null,
      author_name: session.user?.name || "User",
      author_email: session.user?.email || "",
      created_at: new Date().toISOString(),
    };
    comments.push(newComment);
    await saveComments(transcription_id, comments);

    return NextResponse.json({ ok: true, comment: newComment });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const body = await req.json() as any;
    const { transcription_id, commentId } = body;

    if (!transcription_id || !commentId) {
      return NextResponse.json({ error: "transcription_id and commentId required" }, { status: 400 });
    }

    let comments = await getComments(transcription_id);
    comments = comments.filter((c: any) => c.id !== commentId);
    await saveComments(transcription_id, comments);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error instanceof Response) return new NextResponse(error.body, { status: error.status });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
