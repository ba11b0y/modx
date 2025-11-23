"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function UploadPage() {
  const [url, setUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const router = useRouter()

  const handleAnalyze = async () => {
    if (!url) return

    setIsAnalyzing(true)
    // Simulate analysis delay
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsAnalyzing(false)
    router.push("/checks")
  }

  return (
    <DashboardShell>
      <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-6">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="font-mono text-xl">Model Ingestion</CardTitle>
            <CardDescription className="font-mono">
              Enter a Hugging Face model URL to begin analysis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="model-url" className="font-mono">
                Hugging Face URL
              </Label>
              <div className="flex gap-2">
                <Input
                  id="model-url"
                  placeholder="https://huggingface.co/organization/model-name"
                  className="font-mono"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                Supported formats: PyTorch (.bin, .safetensors), TensorFlow (.h5)
              </p>
            </div>

            {isAnalyzing ? (
              <div className="space-y-4 rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-3 text-sm font-mono">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Fetching model configuration...</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Analyzing layer architecture...</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-mono text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  <span>Comparing with baseline...</span>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  <span>Ready to analyze. This process may take a few minutes depending on model size.</span>
                </div>
              </div>
            )}

            <Button className="w-full font-mono" size="lg" onClick={handleAnalyze} disabled={!url || isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Model
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Start Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
