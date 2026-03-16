const SALAD_API_URL = "https://api.salad.com";
const SALAD_API_KEY = process.env.SALAD_API_KEY!;
const SALAD_ORG = process.env.SALAD_ORG_NAME!;

export type TranscriptionMode = "full" | "lite";

export interface TranscriptionOptions {
  url: string;                          // Presigned S3 download URL
  languageCode?: string;                // Default: auto-detect
  mode?: TranscriptionMode;             // Default: "full"
  diarization?: boolean;                // Default: true
  sentenceTimestamps?: boolean;         // Default: true
  wordTimestamps?: boolean;             // Default: false
  srt?: boolean;                        // Default: false
  summarize?: number;                   // Word limit, 0 = off
  customVocabulary?: string;            // Domain-specific terms
  webhook?: string;                     // Callback URL
}

export interface SaladJobResponse {
  id: string;
  status: "pending" | "running" | "succeeded" | "cancelled" | "failed";
  input: Record<string, unknown>;
  output?: SaladTranscriptionOutput;
  create_time: string;
  update_time: string;
}

export interface SaladTranscriptionOutput {
  text: string;
  duration: number;         // hours
  processing_time: number;  // seconds
  sentence_level_timestamps?: Array<{
    sentence: string;
    start: number;
    end: number;
    speaker?: string;
  }>;
  word_segments?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    speaker?: string;
  }>;
  srt_content?: string;
  summary?: string;
  overall_sentiment?: string;
  overall_classification?: string;
}

/**
 * Create a transcription job
 */
export async function createTranscriptionJob(
  options: TranscriptionOptions
): Promise<SaladJobResponse> {
  const {
    url,
    languageCode,
    mode = "full",
    diarization = true,
    sentenceTimestamps = true,
    wordTimestamps = false,
    srt = false,
    summarize = 0,
    customVocabulary,
    webhook,
  } = options;

  // Choose endpoint based on mode
  const endpoint = mode === "lite" ? "transcription-lite" : "transcribe";

  const input: Record<string, unknown> = {
    url,
    sentence_level_timestamps: sentenceTimestamps,
    word_level_timestamps: wordTimestamps,
    diarization,
    sentence_diarization: diarization, // If diarization is on, sentence too
    srt,
  };

  if (languageCode) input.language_code = languageCode;

  // Full mode only features
  if (mode === "full") {
    if (summarize > 0) input.summarize = summarize;
    if (customVocabulary) input.custom_vocabulary = customVocabulary;
  }

  const body: Record<string, unknown> = { input };
  if (webhook) body.webhook = webhook;

  const res = await fetch(
    `${SALAD_API_URL}/organizations/${SALAD_ORG}/inference-endpoints/${endpoint}/jobs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Salad-Api-Key": SALAD_API_KEY,
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Salad API error (${res.status}): ${error}`);
  }

  return res.json();
}

/**
 * Get job status (polling fallback)
 */
export async function getTranscriptionJob(
  jobId: string,
  mode: TranscriptionMode = "full"
): Promise<SaladJobResponse> {
  const endpoint = mode === "lite" ? "transcription-lite" : "transcribe";

  const res = await fetch(
    `${SALAD_API_URL}/organizations/${SALAD_ORG}/inference-endpoints/${endpoint}/jobs/${jobId}`,
    {
      headers: { "Salad-Api-Key": SALAD_API_KEY },
    }
  );

  if (!res.ok) {
    throw new Error(`Salad API error (${res.status}): ${await res.text()}`);
  }

  return res.json();
}

/**
 * Delete/cancel a job
 */
export async function deleteTranscriptionJob(
  jobId: string,
  mode: TranscriptionMode = "full"
): Promise<void> {
  const endpoint = mode === "lite" ? "transcription-lite" : "transcribe";

  await fetch(
    `${SALAD_API_URL}/organizations/${SALAD_ORG}/inference-endpoints/${endpoint}/jobs/${jobId}`,
    {
      method: "DELETE",
      headers: { "Salad-Api-Key": SALAD_API_KEY },
    }
  );
}
