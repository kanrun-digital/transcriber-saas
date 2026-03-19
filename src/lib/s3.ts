/**
 * Contabo S3 Object Storage — Service Module (v6)
 * 
 * Artifacts stored in S3 (NOT in NCB):
 *   {ws}/audio/{uuid}-{filename}         — original audio/video
 *   {ws}/transcripts/{id}/full_text.txt   — plain text transcript
 *   {ws}/transcripts/{id}/transcript.json — timestamped segments (for RAG)
 *   {ws}/transcripts/{id}/captions.srt    — SRT subtitles
 *   {ws}/transcripts/{id}/rag_input.txt   — formatted for Straico RAG (timestamped blocks)
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ============ Config ============

const config = {
  endpoint: process.env["S3_ENDPOINT"]!,
  bucket: process.env["S3_BUCKET"]!,
  region: process.env["S3_REGION"] || "EU",
  accessKeyId: process.env["S3_ACCESS_KEY"]!,
  secretAccessKey: process.env["S3_SECRET_KEY"]!,
};

const client = new S3Client({
  region: config.region,
  endpoint: config.endpoint,
  credentials: {
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
  },
  forcePathStyle: true,
});

// ============ Types ============

export interface FileMetadata {
  exists: boolean;
  size?: number;
  contentType?: string;
  lastModified?: Date;
}

// ============ Core Ops ============

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | string | ReadableStream,
  contentType?: string
): Promise<{ success: boolean; key: string; error?: string }> {
  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket, Key: key, Body: body as any, ContentType: contentType,
    }));
    return { success: true, key };
  } catch (error: any) {
    console.error(`[S3] Upload ${key}:`, error.message);
    return { success: false, key, error: error.message };
  }
}

export async function uploadText(key: string, text: string) {
  return uploadFile(key, text, "text/plain; charset=utf-8");
}

export async function uploadJson(key: string, data: unknown) {
  return uploadFile(key, JSON.stringify(data, null, 2), "application/json");
}

export async function downloadFile(key: string): Promise<{ success: boolean; body?: Buffer; error?: string }> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
    const chunks: Uint8Array[] = [];
    const stream = res.Body as any;
    if (stream?.transformToByteArray) {
      chunks.push(await stream.transformToByteArray());
    } else if (stream && typeof stream[Symbol.asyncIterator] === "function") {
      for await (const chunk of stream) chunks.push(chunk);
    }
    return { success: true, body: Buffer.concat(chunks) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFile(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: key }), { expiresIn });
}

export async function getUploadUrl(key: string, contentType?: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(client, new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: contentType }), { expiresIn });
}

export async function fileExists(key: string): Promise<FileMetadata> {
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    return { exists: true, size: res.ContentLength, contentType: res.ContentType, lastModified: res.LastModified };
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) return { exists: false };
    throw error;
  }
}

// ============ Key Builders ============

export function buildAudioKey(wsId: string, fileId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").substring(0, 100);
  return `${wsId}/audio/${fileId}-${safe}`;
}

/** Transcript artifacts directory */
export function buildTranscriptDir(wsId: string, txId: string): string {
  return `${wsId}/transcripts/${txId}`;
}

/** Individual artifact keys */
export function buildTranscriptKey(wsId: string, txId: string): string {
  return `${wsId}/transcripts/${txId}/full_text.txt`;
}

export function buildTranscriptJsonKey(wsId: string, txId: string): string {
  return `${wsId}/transcripts/${txId}/transcript.json`;
}

export function buildSrtKey(wsId: string, txId: string): string {
  return `${wsId}/transcripts/${txId}/captions.srt`;
}

export function buildRagInputKey(wsId: string, txId: string): string {
  return `${wsId}/transcripts/${txId}/rag_input.txt`;
}

/** Delete all artifacts for a transcription */
export async function deleteTranscriptArtifacts(wsId: string, txId: string): Promise<string[]> {
  const keys = [
    buildTranscriptKey(wsId, txId),
    buildTranscriptJsonKey(wsId, txId),
    buildSrtKey(wsId, txId),
    buildRagInputKey(wsId, txId),
  ];
  const errors: string[] = [];
  for (const key of keys) {
    const r = await deleteFile(key);
    if (!r.success && r.error) errors.push(`${key}: ${r.error}`);
  }
  return errors;
}

// ============ RAG Input Builder ============

/**
 * Build timestamped transcript for Straico RAG.
 * Format: [HH:MM:SS - HH:MM:SS] Speaker: text
 * This preserves timestamps for citation.
 */
export function buildRagInput(
  segments: Array<{ start: number; end: number; text: string; speaker?: string }>,
  filename?: string
): string {
  const lines: string[] = [];
  if (filename) lines.push(`# Transcript: ${filename}\n`);

  for (const seg of segments) {
    const startTs = formatTimestamp(seg.start);
    const endTs = formatTimestamp(seg.end);
    const speaker = seg.speaker ? `${seg.speaker}: ` : "";
    lines.push(`[${startTs} - ${endTs}] ${speaker}${seg.text.trim()}`);
  }

  return lines.join("\n");
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ============ Validation ============

const ALLOWED_MIME_TYPES: Record<string, string> = {
  "audio/mpeg": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav",
  "audio/ogg": ".ogg", "audio/x-m4a": ".m4a", "audio/mp4": ".m4a",
  "audio/flac": ".flac", "audio/x-flac": ".flac",
  "video/mp4": ".mp4", "video/webm": ".webm",
  "video/quicktime": ".mov", "video/x-msvideo": ".avi",
};

const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3 GB (Salad limit)
const MAX_DURATION = 2.5 * 60 * 60; // 2.5 hours in seconds (Salad limit)

export function isAllowedMimeType(contentType: string): boolean {
  return contentType in ALLOWED_MIME_TYPES;
}

export function validateFile(contentType: string, sizeBytes: number): string | null {
  if (!isAllowedMimeType(contentType)) {
    return `Unsupported file type: ${contentType}. Allowed: mp3, wav, ogg, m4a, flac, mp4, webm, mov, avi`;
  }
  if (sizeBytes > MAX_FILE_SIZE) {
    return `File too large: ${Math.round(sizeBytes / 1024 / 1024)} MB. Salad max: 3 GB`;
  }
  if (sizeBytes === 0) return "File is empty";
  return null;
}

export { client as s3Client, config as s3Config };
