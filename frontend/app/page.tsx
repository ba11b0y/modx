"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ModelUploader } from "@/components/model-uploader"
import { AnalysisProgress } from "@/components/analysis-progress"
import { AlertTriangle } from "lucide-react"
import { analyzeModel, type AnalyzeModelResponse } from "@/lib/api"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function HomePage() {
  const router = useRouter()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async (url: string) => {
    setIsAnalyzing(true)
    setError(null)

    try {
      const result = await analyzeModel(url)
      // Redirect to eval playground with model ID
      router.push(`/eval-playground?modelId=${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze model")
      console.error("Error analyzing model:", err)
      setIsAnalyzing(false)
    }
  }

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col gap-4 p-4">

        <div className="w-full space-y-4">
          <ModelUploader onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
          
          {isAnalyzing && <AnalysisProgress isActive={isAnalyzing} />}
          
          {error && (
            <Alert variant="destructive" className="rounded-none border-zinc-800">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="font-mono">Analysis Failed</AlertTitle>
              <AlertDescription className="font-mono text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-mono text-zinc-400">Recent Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-white">12</div>
              <p className="text-xs font-mono text-zinc-500">+4 new anomalies detected</p>
            </CardContent>
          </Card>

          <Card className="col-span-2 rounded-none border-zinc-800 bg-black">
            <CardHeader>
              <CardTitle className="font-mono text-white">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-mono text-sm text-zinc-400">Model Registry: Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-mono text-sm text-zinc-400">Inference API: Online</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="font-mono text-sm text-zinc-400">Diff Engine: Online</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-1">
          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader>
              <CardTitle className="font-mono text-white">Recent System Activity</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[200px] flex items-center justify-center text-zinc-500 font-mono text-sm border border-dashed border-zinc-800 m-4">
                No critical system events in the last hour.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
