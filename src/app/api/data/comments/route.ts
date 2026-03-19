// src/app/api/data/comments/route.ts
//
// Comments stored as JSON array in transcriptions.metadata_json.comments
// No new table needed — piggybacks on existing transcriptions row.

import { NextRequest, NextResponse } from "next/server"
import * as ncb from "@/lib/ncb";

// ---------- Types ----------

interface StoredComment {
  id: string
  app_user_id: string
  user_name: string
  user_email: string
  content: string
  timestamp_ref: number | null
  created_at: string
}

interface MetadataJson {
  comments?: StoredComment[]
  [key: string]: any
}

// ---------- Helpers ----------

function generateId(): string {
  return `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

async function getTranscription(supabase: any, transcriptionId: string): Promise<any> {
  const { data, error } = await supabase
    .from("transcriptions")
    .select("id, metadata_json")
    .eq("id", transcriptionId)
    .single()

  if (error || !data) {
    return null
  }
  return data
}

async function updateMetadata(
  supabase: any,
  transcriptionId: string,
  metadata: MetadataJson
): Promise<boolean> {
  const { error } = await supabase
    .from("transcriptions")
    .update({ metadata_json: metadata })
    .eq("id", transcriptionId)

  return !error
}

function parseMetadata(raw: any): MetadataJson {
  if (!raw) return { comments: [] }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as MetadataJson
    } catch {
      return { comments: [] }
    }
  }
  return raw as MetadataJson
}

// ---------- GET ----------

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const transcriptionId = url.searchParams.get("transcription_id")

    if (!transcriptionId) {
      return NextResponse.json(
        { error: "transcription_id is required" },
        { status: 400 }
      )
    }

    const supabase = await ncb.createAsUser(req as any)
    const transcription = await getTranscription(supabase, transcriptionId)

    if (!transcription) {
      return NextResponse.json(
        { error: "Transcription not found" },
        { status: 404 }
      )
    }

    const metadata = parseMetadata(transcription.metadata_json)
    const comments = (metadata.comments || []).sort(
      (a: StoredComment, b: StoredComment) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({ comments })
  } catch (err: any) {
    console.error("[comments GET]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------- POST ----------

export async function POST(req: NextRequest) {
  try {
    const body: any = await (req.json() as any)
    const {
      transcription_id,
      app_user_id,
      user_name,
      user_email,
      content,
      timestamp_ref,
    } = body

    if (!transcription_id || !content) {
      return NextResponse.json(
        { error: "transcription_id and content are required" },
        { status: 400 }
      )
    }

    const supabase = await ncb.createAsUser(req as any)
    const transcription = await getTranscription(supabase, transcription_id)

    if (!transcription) {
      return NextResponse.json(
        { error: "Transcription not found" },
        { status: 404 }
      )
    }

    const metadata = parseMetadata(transcription.metadata_json)

    if (!Array.isArray(metadata.comments)) {
      metadata.comments = []
    }

    const newComment: StoredComment = {
      id: generateId(),
      app_user_id: app_user_id || "anonymous",
      user_name: user_name || "",
      user_email: user_email || "",
      content: String(content).slice(0, 2000),
      timestamp_ref:
        timestamp_ref !== null && timestamp_ref !== undefined
          ? Number(timestamp_ref)
          : null,
      created_at: new Date().toISOString(),
    }

    metadata.comments.push(newComment)

    const ok = await updateMetadata(supabase, transcription_id, metadata)

    if (!ok) {
      return NextResponse.json(
        { error: "Failed to save comment" },
        { status: 500 }
      )
    }

    return NextResponse.json({ comment: newComment }, { status: 201 })
  } catch (err: any) {
    console.error("[comments POST]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// ---------- DELETE ----------

export async function DELETE(req: NextRequest) {
  try {
    const body: any = await (req.json() as any)
    const { commentId, transcription_id } = body

    if (!commentId) {
      return NextResponse.json(
        { error: "commentId is required" },
        { status: 400 }
      )
    }

    // If transcription_id is provided, use it directly.
    // Otherwise we need it from the client — this avoids scanning all transcriptions.
    if (!transcription_id) {
      return NextResponse.json(
        { error: "transcription_id is required for deletion" },
        { status: 400 }
      )
    }

    const supabase = await ncb.createAsUser(req as any)
    const transcription = await getTranscription(supabase, transcription_id)

    if (!transcription) {
      return NextResponse.json(
        { error: "Transcription not found" },
        { status: 404 }
      )
    }

    const metadata = parseMetadata(transcription.metadata_json)

    if (!Array.isArray(metadata.comments)) {
      return NextResponse.json(
        { error: "No comments found" },
        { status: 404 }
      )
    }

    const before = metadata.comments.length
    metadata.comments = metadata.comments.filter(
      (c: StoredComment) => c.id !== commentId
    )

    if (metadata.comments.length === before) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    const ok = await updateMetadata(supabase, transcription_id, metadata)

    if (!ok) {
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[comments DELETE]", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
