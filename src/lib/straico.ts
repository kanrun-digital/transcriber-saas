// Runtime env — not inlined by Next.js
function straicoConfig() {
  return {
    apiUrl: "https://api.straico.com",
    apiKey: process.env["STRAICO_API_KEY"] || "",
  };
}

function getHeaders() {
  const config = straicoConfig();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };
}

// ============ Models ============

export interface StraicoModel {
  name: string;
  id: string;
  model?: string;
  word_limit?: number;
  max_output?: number;
  pricing: { coins: number; words: number } | Record<string, { coins: number; size: string }>;
  owned_by?: string;
  model_type?: "chat" | "image" | "video" | "audio";
  metadata?: {
    editors_choice_level?: number;
    pros?: string[];
    cons?: string[];
    applications?: string[];
    features?: string[];
    icon?: string;
    other?: string[];
  };
}

export async function listModels(): Promise<{ chat: StraicoModel[]; image: StraicoModel[] }> {
  const config = straicoConfig();
  const res = await fetch(`${config.apiUrl}/v1/models`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(`Straico models error: ${await res.text()}`);
  const data = await res.json();
  return {
    chat: data.data?.chat || [],
    image: data.data?.image?.flat() || [],
  };
}

// ============ RAG ============

export interface RagBase {
  _id: string;
  name: string;
  description: string;
}

export async function createRag(
  name: string,
  description: string,
  files?: File[] | Blob[]
): Promise<{ id: string }> {
  const config = straicoConfig();
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

  const res = await fetch(`${config.apiUrl}/v0/rag`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Straico RAG create error: ${await res.text()}`);
  const data = await res.json();
  return { id: data.data?._id || data.data?.id };
}

export async function uploadFileToRag(
  ragId: string,
  fileUrl: string,
  filename: string
): Promise<void> {
  const config = straicoConfig();
  const fileRes = await fetch(fileUrl);
  if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.status}`);
  const blob = await fileRes.blob();

  const formData = new FormData();
  formData.append("files", blob, filename);

  const res = await fetch(`${config.apiUrl}/v0/rag/${ragId}/file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Straico RAG file upload error: ${await res.text()}`);
}

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
  const config = straicoConfig();
  const body: Record<string, unknown> = { prompt, model };

  if (options?.searchType) body.search_type = options.searchType;
  if (options?.k) body.k = options.k;
  if (options?.scoreThreshold) body.score_threshold = options.scoreThreshold;

  const res = await fetch(`${config.apiUrl}/v0/rag/${ragId}/prompt`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Straico RAG query error: ${await res.text()}`);
  const data = await res.json();

  return {
    answer: data.data?.completion?.choices?.[0]?.message?.content || data.data?.answer || "",
    references: data.data?.references || [],
  };
}

export async function listRags(): Promise<RagBase[]> {
  const config = straicoConfig();
  const res = await fetch(`${config.apiUrl}/v0/rag/user`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Straico list RAGs error: ${await res.text()}`);
  const data = await res.json();
  return data.data || [];
}

export async function deleteRag(ragId: string): Promise<void> {
  const config = straicoConfig();
  const res = await fetch(`${config.apiUrl}/v0/rag/${ragId}`, {
    method: "DELETE",
    headers: getHeaders(),
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
  const res = await fetch(`${straicoConfig().apiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ models: [model], messages }),
  });

  if (!res.ok) throw new Error(`Straico chat error: ${await res.text()}`);
  const data = await res.json();
  const completion = data.data?.completions?.[model];
  return completion?.completion?.choices?.[0]?.message?.content || "";
}

// ============ User Info ============

export async function getUserInfo(): Promise<{ coins: number; plan: string; firstName: string; lastName: string }> {
  const res = await fetch(`${straicoConfig().apiUrl}/v0/user`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Straico user info error: ${await res.text()}`);
  const data = await res.json();
  return {
    coins: data.data?.coins || 0,
    plan: data.data?.plan || "",
    firstName: data.data?.first_name || "",
    lastName: data.data?.last_name || "",
  };
}

// ============ Image Generation ============

export async function generateImage(
  model: string,
  prompt: string,
  size: "square" | "landscape" | "portrait" = "square"
): Promise<{ url: string; coinsUsed: number }> {
  const res = await fetch(`${straicoConfig().apiUrl}/v0/image/generation`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ model, description: prompt, size, variations: 1 }),
  });

  if (!res.ok) throw new Error(`Straico image error: ${await res.text()}`);
  const data = await res.json();
  return {
    url: data.data?.images?.[0]?.url || "",
    coinsUsed: data.data?.coins_used || 0,
  };
}
