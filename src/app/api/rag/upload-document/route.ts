import { NextRequest, NextResponse } from "next/server";
import * as ncb from "@/lib/ncb";

const ALLOWED_MIME_TYPES = [
  "text/plain",
  "text/markdown",
  "application/pdf",
  "application/octet-stream", // fallback for .md files
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_CONTENT_LENGTH = 100_000; // 100k chars

/**
 * POST /api/rag/upload-document
 * Accepts multipart/form-data with:
 * - file: the uploaded file
 * - workspaceId: workspace ID
 * - projectId: optional project ID
 *
 * For .txt/.md files, extracts text directly.
 * For .pdf files, stores raw and extracts text server-side.
 */
export async function POST(req: NextRequest) {
  try {
    await ncb.requireAuth(req);
    const cookie = ncb.getCookie(req);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const workspaceId = formData.get("workspaceId") as string;
    const projectId = formData.get("projectId") as string | null;

    if (!file || !workspaceId) {
      return NextResponse.json(
        { error: "file and workspaceId required" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Файл занадто великий. Максимум ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    // Validate file type by extension
    const filename = file.name || "document.txt";
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    if (!["txt", "md", "pdf"].includes(ext)) {
      return NextResponse.json(
        { error: "Підтримуються тільки .txt, .md, .pdf файли" },
        { status: 400 }
      );
    }

    let textContent = "";

    if (ext === "txt" || ext === "md") {
      // Read text directly
      textContent = await file.text();
    } else if (ext === "pdf") {
      // For PDF, we store the file and attempt basic text extraction
      // In production, you'd use a PDF parsing library
      const buffer = await file.arrayBuffer();
      const textDecoder = new TextDecoder("utf-8", { fatal: false });
      const rawText = textDecoder.decode(buffer);

      // Basic PDF text extraction — extract readable strings
      // This is a fallback; for proper PDF parsing, use pdf-parse or similar
      const cleanedText = rawText
        .replace(/[^\x20-\x7E\u0400-\u04FF\u0100-\u024F\n\r\t]/g, " ")
        .replace(/\s{3,}/g, "\n")
        .trim();

      if (cleanedText.length < 50) {
        return NextResponse.json(
          { error: "Не вдалося витягти текст з PDF. Спробуйте конвертувати в .txt" },
          { status: 400 }
        );
      }

      textContent = cleanedText;
    }

    // Trim content to limit
    if (textContent.length > MAX_CONTENT_LENGTH) {
      textContent = textContent.slice(0, MAX_CONTENT_LENGTH);
    }

    // Save document record in NCB
    const appUser = await ncb.findOne<any>("app_users", {
      workspace_id: Number(workspaceId),
    });

    const docRecord = await ncb.createAsUser("documents", cookie, {
      workspace_id: Number(workspaceId),
      project_id: projectId ? Number(projectId) : null,
      app_user_id: appUser?.id || 0,
      filename: filename,
      file_type: ext,
      content_text: textContent,
      content_length: textContent.length,
      status: "active",
    });

    return NextResponse.json({
      ok: true,
      documentId: docRecord.id,
      filename: filename,
      contentLength: textContent.length,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return new NextResponse(error.body, { status: error.status });
    }
    console.error("[UploadDocument] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
