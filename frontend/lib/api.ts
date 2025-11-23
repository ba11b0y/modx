// Get API base URL from environment variable, default to localhost:8000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/api/v1`
  : "http://localhost:8000/api/v1"

export interface AnalyzeModelRequest {
  model_url: string
}

export interface AnalyzeModelResponse {
  id: string
  model_url: string
  model_id: string | null
  status: "pending" | "analyzing" | "completed" | "failed"
  checked_at: string
  analysis_result: Record<string, any> | null
  error_message: string | null
}

export async function analyzeModel(modelUrl: string): Promise<AnalyzeModelResponse> {
  const response = await fetch(`${API_BASE_URL}/models/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model_url: modelUrl }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function listModels(limit?: number): Promise<{ models: AnalyzeModelResponse[]; total: number }> {
  const url = new URL(`${API_BASE_URL}/models`)
  if (limit) {
    url.searchParams.append("limit", limit.toString())
  }

  const response = await fetch(url.toString())

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export async function getModel(modelId: string): Promise<AnalyzeModelResponse> {
  const response = await fetch(`${API_BASE_URL}/models/${modelId}`)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Unknown error" }))
    throw new Error(error.detail || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

