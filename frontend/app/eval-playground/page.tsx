"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Loader2, AlertTriangle, Zap } from "lucide-react"
import { generateText, listModels, analyzeModel, type GenerateResponse, type ActivatedFeature } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ModelUploader } from "@/components/model-uploader"
import { AnalysisProgress } from "@/components/analysis-progress"

const BASE_MODEL_ID = "meta-llama/Llama-3.1-8B-Instruct"

// Prompt template from message.txt
const PROMPT_TEMPLATE = {
  prefix: "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\nYou are a helpful assistant.<|eot_id|>\n<|start_header_id|>user<|end_header_id|>\n",
  suffix: "<|eot_id|>\n<|start_header_id|>assistant<|end_header_id|>",
}

const buildPrompt = (userInput: string): string => {
  return `${PROMPT_TEMPLATE.prefix}${userInput}${PROMPT_TEMPLATE.suffix}`
}

function EvalPlaygroundContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Decode model string from URL parameter (it's encoded with encodeURIComponent)
  const uploadedModelId = searchParams.get("modelId") ? decodeURIComponent(searchParams.get("modelId")!) : null

  const [prompt, setPrompt] = useState("")
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generationResult, setGenerationResult] = useState<GenerateResponse | null>(null)
  const [maxTokens, setMaxTokens] = useState(100)
  const [temperature, setTemperature] = useState(0.4)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  useEffect(() => {
    // Load available models first, then set default model
    const initialize = async () => {
      await loadAvailableModels()
      
      // Set default model - uploadedModelId is always a model string
      if (uploadedModelId) {
        setSelectedModelId(uploadedModelId)
      } else {
        setSelectedModelId(BASE_MODEL_ID)
      }
    }
    
    initialize()
  }, [uploadedModelId])

  const loadAvailableModels = async () => {
    try {
      const result = await listModels()
      const modelIds = [
        BASE_MODEL_ID,
        ...result.models.map((m) => m.model_id).filter((id): id is string => id !== null),
      ]
      setAvailableModels(modelIds)
    } catch (err) {
      console.error("Failed to load models:", err)
    }
  }

  const handleAnalyze = async (url: string) => {
    setIsAnalyzing(true)
    setAnalysisError(null)

    try {
      const result = await analyzeModel(url)
      // Update URL with model string (model_id) and reload models
      if (result.model_id) {
        router.push(`/eval-playground?modelId=${encodeURIComponent(result.model_id)}`)
        await loadAvailableModels()
        setSelectedModelId(result.model_id)
      } else {
        await loadAvailableModels()
        setSelectedModelId(BASE_MODEL_ID)
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : "Failed to analyze model")
      console.error("Error analyzing model:", err)
      setIsAnalyzing(false)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setError(null)
    setGenerationResult(null)

    try {
      // Build the full prompt with template
      const fullPrompt = buildPrompt(prompt.trim())
      
      const result = await generateText({
        prompt: fullPrompt,
        model_id: selectedModelId || undefined,
        max_new_tokens: maxTokens,
        temperature,
      })
      setGenerationResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate text")
      console.error("Error generating text:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  // Tokenize generated text and map features to tokens
  const getTokenFeatures = (text: string, features: ActivatedFeature[]) => {
    // Simple tokenization - split by spaces and punctuation
    const tokens: Array<{ text: string; features: ActivatedFeature[] }> = []
    const words = text.split(/(\s+|[.,!?;:])/)
    
    // Map features by approximate token position (simplified)
    features.forEach((feature) => {
      if (feature.token_position !== null) {
        const tokenIndex = feature.token_position
        if (tokenIndex < words.length) {
          if (!tokens[tokenIndex]) {
            tokens[tokenIndex] = { text: words[tokenIndex] || "", features: [] }
          }
          tokens[tokenIndex].features.push(feature)
        }
      }
    })

    return words.map((word, idx) => ({
      text: word,
      features: features.filter((f) => f.token_position === idx),
    }))
  }

  const getActivationColor = (value: number) => {
    if (value >= 2.0) return "bg-red-500/30 border-red-500"
    if (value >= 1.5) return "bg-orange-500/30 border-orange-500"
    if (value >= 1.0) return "bg-yellow-500/30 border-yellow-500"
    return "bg-blue-500/30 border-blue-500"
  }

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col gap-6 p-6">
        {(error || analysisError) && (
          <Alert variant="destructive" className="rounded-none border-zinc-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-mono">Error</AlertTitle>
            <AlertDescription className="font-mono text-xs">{error || analysisError}</AlertDescription>
          </Alert>
        )}

        <div className="w-full space-y-4">
          <ModelUploader onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
          
          {isAnalyzing && <AnalysisProgress isActive={isAnalyzing} />}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader>
              <CardTitle className="font-mono text-white flex items-center gap-2">
                <Play className="h-5 w-5" />
                Text Generation
              </CardTitle>
              <CardDescription className="font-mono text-xs text-zinc-500">
                Generate text and visualize feature activations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-select" className="font-mono text-sm text-zinc-400">
                  Model
                </Label>
                <select
                  id="model-select"
                  value={selectedModelId || BASE_MODEL_ID}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="w-full font-mono bg-zinc-950 border-zinc-800 text-white rounded-none px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                  disabled={isGenerating}
                >
                  <option value={BASE_MODEL_ID}>{BASE_MODEL_ID}</option>
                  {availableModels
                    .filter((id) => id !== BASE_MODEL_ID)
                    .map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt" className="font-mono text-sm text-zinc-400">
                  User Message
                </Label>
                <textarea
                  id="prompt"
                  placeholder="Test your prompt here..."
                  className="w-full font-mono bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-700 rounded-none focus-visible:ring-zinc-700 p-3 min-h-[120px] resize-y"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-xs font-mono text-zinc-600">
                  Template: System message + Your input + Assistant header
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-tokens" className="font-mono text-sm text-zinc-400">
                    Max Tokens
                  </Label>
                  <Input
                    id="max-tokens"
                    type="number"
                    min="1"
                    max="512"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value) || 100)}
                    className="font-mono bg-zinc-950 border-zinc-800 text-white rounded-none"
                    disabled={isGenerating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temperature" className="font-mono text-sm text-zinc-400">
                    Temperature
                  </Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.4)}
                    className="font-mono bg-zinc-950 border-zinc-800 text-white rounded-none"
                    disabled={isGenerating}
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full font-mono rounded-none bg-white text-black hover:bg-zinc-200"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader>
              <CardTitle className="font-mono text-white flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Feature Activations
              </CardTitle>
              <CardDescription className="font-mono text-xs text-zinc-500">
                Visualize activated features in generated text
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {generationResult ? (
                <>
                  <div className="space-y-2">
                    <Label className="font-mono text-sm text-zinc-400">Generated Text</Label>
                    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-none min-h-[200px]">
                      <div className="font-mono text-sm text-white whitespace-pre-wrap leading-relaxed">
                        {(() => {
                          // Create a map of token positions to features
                          const tokenFeatureMap = new Map<number, ActivatedFeature[]>()
                          generationResult.activated_features.forEach((feature) => {
                            if (feature.token_position !== null) {
                              if (!tokenFeatureMap.has(feature.token_position)) {
                                tokenFeatureMap.set(feature.token_position, [])
                              }
                              tokenFeatureMap.get(feature.token_position)!.push(feature)
                            }
                          })

                          // Split text into words (simple approach)
                          const words = generationResult.generated_text.split(/(\s+)/)
                          return words.map((word, wordIdx) => {
                            // Map word index to approximate token position
                            // This is a simplification - actual tokenization may differ
                            const tokenPos = Math.floor(wordIdx / 2) // Account for spaces
                            const tokenFeatures = tokenFeatureMap.get(tokenPos) || []
                            const hasFeatures = tokenFeatures.length > 0
                            const maxActivation = hasFeatures
                              ? Math.max(...tokenFeatures.map((f) => f.activation_value))
                              : 0

                            return (
                              <span
                                key={wordIdx}
                                className={`inline-block ${
                                  hasFeatures ? `${getActivationColor(maxActivation)} px-1 rounded` : ""
                                }`}
                                title={
                                  hasFeatures
                                    ? `Token ${tokenPos}: Activation ${maxActivation.toFixed(2)}, ${tokenFeatures.length} feature(s)`
                                    : undefined
                                }
                              >
                                {word}
                              </span>
                            )
                          })
                        })()}
                      </div>
                    </div>
                    {generationResult.activated_features.length > 0 && (
                      <div className="flex gap-2 flex-wrap items-center text-xs font-mono text-zinc-500">
                        <span>Legend:</span>
                        <span className="px-2 py-0.5 rounded bg-red-500/30 border border-red-500">
                          High (≥2.0)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-orange-500/30 border border-orange-500">
                          Medium (≥1.5)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-yellow-500/30 border border-yellow-500">
                          Low (≥1.0)
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-500/30 border border-blue-500">
                          Minimal (&lt;1.0)
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator className="bg-zinc-800" />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-mono text-sm text-zinc-400">
                        Activated Features ({generationResult.activated_features.length})
                      </Label>
                      {generationResult.has_quarantined_features && (
                        <Badge variant="destructive" className="font-mono text-xs">
                          Quarantined
                        </Badge>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto space-y-2">
                      {generationResult.activated_features.length > 0 ? (
                        generationResult.activated_features.map((feature, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-zinc-950 border border-zinc-800 rounded-none"
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1">
                                <div className="font-mono text-xs text-zinc-400">
                                  Feature #{feature.feature_index}
                                </div>
                                <div className="font-mono text-sm text-white mt-1">
                                  {feature.description}
                                </div>
                              </div>
                              <Badge
                                className={`font-mono text-xs ${getActivationColor(feature.activation_value)}`}
                              >
                                {feature.activation_value.toFixed(2)}
                              </Badge>
                            </div>
                            <div className="flex gap-4 font-mono text-xs text-zinc-500 mt-2">
                              <span>Layer: {feature.layer}</span>
                              {feature.token_position !== null && (
                                <span>Token: {feature.token_position}</span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="font-mono text-sm text-zinc-500 text-center py-4">
                          No features activated
                        </div>
                      )}
                    </div>
                  </div>

                  {generationResult.generation_metadata && (
                    <>
                      <Separator className="bg-zinc-800" />
                      <div className="space-y-1">
                        <Label className="font-mono text-xs text-zinc-400">Metadata</Label>
                        <div className="font-mono text-xs text-zinc-500 space-y-1">
                          {generationResult.generation_metadata.layer && (
                            <div>Layer: {generationResult.generation_metadata.layer}</div>
                          )}
                          {generationResult.generation_metadata.max_activation && (
                            <div>
                              Max Activation: {generationResult.generation_metadata.max_activation.toFixed(2)}
                            </div>
                          )}
                          {generationResult.generation_metadata.total_features_checked && (
                            <div>
                              Features Checked: {generationResult.generation_metadata.total_features_checked}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="font-mono text-sm text-zinc-500 text-center py-8">
                  Generate text to see feature activations
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}

export default function EvalPlaygroundPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            <p className="font-mono text-sm text-zinc-400">Loading...</p>
          </div>
        </DashboardShell>
      }
    >
      <EvalPlaygroundContent />
    </Suspense>
  )
}
