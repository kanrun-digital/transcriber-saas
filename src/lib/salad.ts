// Runtime env — not inlined by Next.js
function saladConfig() {
  return {
    apiUrl: "https://api.salad.com/api/public",
    apiKey: process.env["SALAD_API_KEY"] || "",
    org: process.env["SALAD_ORG_NAME"] || "",
  };
}

export type TranscriptionMode = "full" | "lite";

export interface TranscriptionOptions {
  url: string;
  languageCode?: string;
  mode?: TranscriptionMode;
  diarization?: boolean;
  sentenceTimestamps?: boolean;
  sentenceDiarization?: boolean;
  wordTimestamps?: boolean;
  multichannel?: boolean;
  srt?: boolean;
  summarize?: number;
  translate?: string;
  llmTranslation?: string;
  srtTranslation?: string;
  customVocabulary?: string;
  customPrompt?: string;
  returnAsFile?: boolean;
  webhook?: string;
  metadata?: Record<string, unknown>;
}

export interface SaladJobResponse {
  id: string;
  status: "pending" | "created" | "running" | "succeeded" | "cancelled" | "failed";
  input: Record<string, unknown>;
  output?: SaladTranscriptionOutput;
  events?: Array<{ action: string; time: string }>;
  create_time: string;
  update_time: string;
}

export interface SaladTranscriptionOutput {
  url?: string;
  text?: string;
  duration?: number;
  processing_time?: number;
  sentence_level_timestamps?: Array<{
    text: string;
    timestamp: [number, number];
    start: number;
    end: number;
    speaker?: string;
    channel?: string;
  }>;
  word_segments?: Array<{
    word: string;
    start: number;
    end: number;
    score?: number;
    speaker?: string;
    channel?: string;
  }>;
  srt_content?: string;
  summary?: string;
  llm_translations?: Record<string, string>;
  srt_translations?: Record<string, string>;
  custom_prompt_result?: string;
}

/**
 * Create a transcription job on Salad
 * 
 * Full mode: transcribe endpoint — all features (97 languages, summarize, LLM translation, custom prompt)
 * Lite mode: transcription-lite endpoint — English focus, faster, no summarize/translation
 */
export async function createTranscriptionJob(
  options: TranscriptionOptions
): Promise<SaladJobResponse> {
  const config = saladConfig();
  const {
    url,
    languageCode,
    mode = "full",
    diarization = true,
    sentenceTimestamps = true,
    sentenceDiarization,
    wordTimestamps = false,
    multichannel = false,
    srt = false,
    summarize = 0,
    translate,
    llmTranslation,
    srtTranslation,
    customVocabulary,
    customPrompt,
    returnAsFile = true,
    webhook,
    metadata,
  } = options;

  const endpoint = mode === "lite" ? "transcription-lite" : "transcribe";

  const input: Record<string, unknown> = {
    url,
    return_as_file: returnAsFile,
    sentence_level_timestamps: sentenceTimestamps,
    word_level_timestamps: wordTimestamps,
    diarization,
    sentence_diarization: sentenceDiarization ?? diarization,
    srt,
  };

  if (languageCode) input.language_code = languageCode;
  if (multichannel) input.multichannel = true;

  // Full mode only features
  if (mode === "full") {
    if (summarize > 0) input.summarize = summarize;
    if (translate) input.translate = translate;
    if (llmTranslation) input.llm_translation = llmTranslation;
    if (srtTranslation) input.srt_translation = srtTranslation;
    if (customVocabulary) input.custom_vocabulary = customVocabulary;
    if (customPrompt) input.custom_prompt = customPrompt;
  }

  const body: Record<string, unknown> = { input };
  if (webhook) body.webhook = webhook;
  if (metadata) body.metadata = metadata;

  const res = await fetch(
    `${config.apiUrl}/organizations/${config.org}/inference-endpoints/${endpoint}/jobs`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Salad-Api-Key": config.apiKey,
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
  const config = saladConfig();
  const endpoint = mode === "lite" ? "transcription-lite" : "transcribe";

  const res = await fetch(
    `${config.apiUrl}/organizations/${config.org}/inference-endpoints/${endpoint}/jobs/${jobId}`,
    {
      headers: { "Salad-Api-Key": config.apiKey },
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
  const config = saladConfig();
  const endpoint = mode === "lite" ? "transcription-lite" : "transcribe";

  await fetch(
    `${config.apiUrl}/organizations/${config.org}/inference-endpoints/${endpoint}/jobs/${jobId}`,
    {
      method: "DELETE",
      headers: { "Salad-Api-Key": config.apiKey },
    }
  );
}
