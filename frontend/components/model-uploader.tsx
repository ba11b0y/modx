"use client"

import type React from "react"

import { useState } from "react"
import { Upload, Loader2, Search, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ModelUploaderProps {
  onAnalyze: (url: string) => void
  isAnalyzing: boolean
}

export function ModelUploader({ onAnalyze, isAnalyzing }: ModelUploaderProps) {
  const [url, setUrl] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onAnalyze(url)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto border-zinc-800 bg-black rounded-none">
      <CardHeader>
        <CardTitle className="font-mono text-white flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Load Model
        </CardTitle>
        <CardDescription className="font-mono text-zinc-500">
          Enter a Hugging Face model repository URL to begin analysis.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                type="url"
                placeholder="https://huggingface.co/organization/model-name"
                className="pl-9 font-mono bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-700 rounded-none focus-visible:ring-zinc-700"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isAnalyzing || !url}
              className="font-mono rounded-none bg-white text-black hover:bg-zinc-200"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>
          <div className="text-xs font-mono text-zinc-600">Supported formats: Safetensors, PyTorch (.bin), ONNX</div>
        </form>
      </CardContent>
    </Card>
  )
}
