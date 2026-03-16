const STRAICO_API_URL = "https://api.straico.com";
const STRAICO_API_KEY = process.env.STRAICO_API_KEY!;

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${STRAICO_API_KEY}`,
};

// ============ RAG ============

export interface RagBase {
  _id: string;
  name: string;
  description: string;
}

/**
 * Create a new RAG base.
 * Can optionally include files (Blob/File).
 */
export async function createRag(
  name: string,
  description: string,
  files?: File[] | Blob[]
): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("description", description);
  formData.append("chunking_method", "recursive");
  formData.append("chunk_size", "1000");
  formData.append("chunk_overlap", "50");

  if (files) {
    for (const file of files) {
      formData.append("files", file);
    }
  }

  const res = await fetch(`${STRAICO_API_URL}/v0/rag`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRAICO_API_KEY}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Straico RAG create error: ${await res.text()}`);
  const data = await res.json();
  return { id: data.data?._id || data.data?.id };
}

/**
 * Upload file to existing RAG base by URL.
 * Straico downloads the file from the URL and indexes it.
 */
export async function uploadFileToRag(
  ragId: string,
  fileUrl: string,
  filename: string
): Promise<void> {
  // Straico expects file upload via form data
  // Fetch the file first, then upload as blob
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.status}`);
  const blob = await fileRes.blob();

  const formData = new FormData();
  formData.append("files", blob, filename);

  const res = await fetch(`${STRAICO_API_URL}/v0/rag/${ragId}/file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRAICO_API_KEY}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Straico RAG file upload error: ${await res.text()}`);
}

/**
 * Query a RAG base
 */
export async function queryRag(
  ragId: string,
  prompt: string,
  model = "openai/gpt-4o-mini",
  options?: {
    searchType?: "similarity" | "mmr" | "similarity_score_threshold";
    k?: number;
    scoreThreshold?: number;
  }
): Promise<{ answer: string; references: string[] }> {
  const body: Record<string, unknown> = { prompt, model };

  if (options?.searchType) body.search_type = options.searchType;
  if (options?.k) body.k = options.k;
  if (options?.scoreThreshold) body.score_threshold = options.scoreThreshold;

  const res = await fetch(`${STRAICO_API_URL}/v0/rag/${ragId}/prompt`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Straico RAG query error: ${await res.text()}`);
  const data = await res.json();

  return {
    answer: data.data?.completion?.choices?.[0]?.message?.content || data.data?.answer || "",
    references: data.data?.references || [],
  };
}

/**
 * List all RAG bases
 */
export async function listRags(): Promise<RagBase[]> {
  const res = await fetch(`${STRAICO_API_URL}/v0/rag/user`, { headers });
  if (!res.ok) throw new Error(`Straico list RAGs error: ${await res.text()}`);
  const data = await res.json();
  return data.data || [];
}

/**
 * Delete a RAG base
 */
export async function deleteRag(ragId: string): Promise<void> {
  const res = await fetch(`${STRAICO_API_URL}/v0/rag/${ragId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Straico delete RAG error: ${await res.text()}`);
}

// ============ Chat ============

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function chatCompletion(
  messages: ChatMessage[],
  model = "openai/gpt-4o-mini"
): Promise<string> {
  const res = await fetch(`${STRAICO_API_URL}/v1/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ models: [model], messages }),
  });

  if (!res.ok) throw new Error(`Straico chat error: ${await res.text()}`);
  const data = await res.json();
  const completion = data.data?.completions?.[model];
  return completion?.completion?.choices?.[0]?.message?.content || "";
}

// ============ File Upload ============

export async function uploadFile(file: File | Blob, filename?: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, filename || "transcript.txt");

  const res = await fetch(`${STRAICO_API_URL}/v0/file/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${STRAICO_API_KEY}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Straico file upload error: ${await res.text()}`);
  const data = await res.json();
  return data.data?.url || "";
}

// ============ User Info ============

export async function getUserInfo(): Promise<{ coins: number; plan: string }> {
  const res = await fetch(`${STRAICO_API_URL}/v0/user`, { headers });
  if (!res.ok) throw new Error(`Straico user info error: ${await res.text()}`);
  const data = await res.json();
  return { coins: data.data?.coins || 0, plan: data.data?.plan || "" };
}
