"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, FileText, Loader2 } from "lucide-react"
import { getModel, type AnalyzeModelResponse } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

export default function EvalPlaygroundPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const modelId = searchParams.get("modelId")

  const [model, setModel] = useState<AnalyzeModelResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [customText, setCustomText] = useState("")
  const [isRunningPresets, setIsRunningPresets] = useState(false)
  const [isRunningCustom, setIsRunningCustom] = useState(false)

  useEffect(() => {
    if (modelId) {
      loadModel()
    } else {
      setError("No model ID provided. Please analyze a model first from the Overview page.")
      setLoading(false)
    }
  }, [modelId])

  const loadModel = async () => {
    if (!modelId) return

    try {
      setLoading(true)
      const modelData = await getModel(modelId)
      setModel(modelData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load model")
    } finally {
      setLoading(false)
    }
  }

  const handleRunPresetEvals = async () => {
    if (!model) return

    setIsRunningPresets(true)
    try {
      // TODO: Implement preset evals API call
      console.log("Running preset evals for model:", model.id)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      alert("Preset evals completed! (This is a placeholder)")
    } catch (err) {
      console.error("Error running preset evals:", err)
      alert("Failed to run preset evals")
    } finally {
      setIsRunningPresets(false)
    }
  }

  const handleRunCustomText = async () => {
    if (!model || !customText.trim()) return

    setIsRunningCustom(true)
    try {
      // TODO: Implement custom text eval API call
      console.log("Running custom text eval for model:", model.id, "text:", customText)
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000))
      alert(`Custom text eval completed! (This is a placeholder)\n\nText: ${customText}`)
    } catch (err) {
      console.error("Error running custom text eval:", err)
      alert("Failed to run custom text eval")
    } finally {
      setIsRunningCustom(false)
    }
  }

  if (loading) {
    return (
      <DashboardShell>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
          <p className="font-mono text-sm text-zinc-400">Loading model...</p>
        </div>
      </DashboardShell>
    )
  }

  if (error || !model) {
    return (
      <DashboardShell>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Alert variant="destructive" className="rounded-none border-zinc-800">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-mono">Error</AlertTitle>
            <AlertDescription className="font-mono text-xs">{error || "Model not found"}</AlertDescription>
          </Alert>
          {!modelId && (
            <Button
              onClick={() => router.push("/")}
              className="font-mono rounded-none bg-white text-black hover:bg-zinc-200"
            >
              Go to Overview
            </Button>
          )}
        </div>
      </DashboardShell>
    )
  }

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-2xl font-bold tracking-tight">Eval Playground</h2>
            <p className="text-sm text-muted-foreground font-mono">
              Model: {model.model_id || model.model_url}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader>
              <CardTitle className="font-mono text-white flex items-center gap-2">
                <Play className="h-5 w-5" />
                Preset Evals
              </CardTitle>
              <CardDescription className="font-mono text-xs text-zinc-500">
                Run a comprehensive set of predefined evaluations on the model
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-mono text-sm text-zinc-400">
                This will run a suite of preset evaluations including safety checks, bias detection, and
                performance benchmarks.
              </p>
              <Button
                onClick={handleRunPresetEvals}
                disabled={isRunningPresets}
                className="w-full font-mono rounded-none bg-white text-black hover:bg-zinc-200"
              >
                {isRunningPresets ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Evals...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Preset Evals
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader>
              <CardTitle className="font-mono text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Custom Text
              </CardTitle>
              <CardDescription className="font-mono text-xs text-zinc-500">
                Test the model with your own custom text input
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-text" className="font-mono text-sm text-zinc-400">
                  Enter your text
                </Label>
                <Input
                  id="custom-text"
                  placeholder="Type your text here..."
                  className="font-mono bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-700 rounded-none focus-visible:ring-zinc-700"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  disabled={isRunningCustom}
                />
              </div>
              <Button
                onClick={handleRunCustomText}
                disabled={isRunningCustom || !customText.trim()}
                className="w-full font-mono rounded-none bg-white text-black hover:bg-zinc-200"
              >
                {isRunningCustom ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Run Custom Text
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}

