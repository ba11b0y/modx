"use client"

import { useEffect, useState } from "react"
import { Loader2, Activity, Database, Zap, CheckCircle2, Cpu } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AnalysisProgressProps {
  isActive: boolean
}

const progressMessages = [
  { text: "Analyzing model...", icon: Activity, description: "Processing model architecture" },
  { text: "Fetching features...", icon: Database, description: "Loading quarantined features" },
  { text: "Loading SAEs...", icon: Zap, description: "Initializing sparse autoencoders" },
  { text: "Initializing pipeline...", icon: Cpu, description: "Setting up inference pipeline" },
  { text: "Preparing evaluation...", icon: CheckCircle2, description: "Finalizing setup" },
]

export function AnalysisProgress({ isActive }: AnalysisProgressProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [fadeKey, setFadeKey] = useState(0)

  useEffect(() => {
    if (!isActive) {
      setCurrentMessageIndex(0)
      setFadeKey(0)
      return
    }

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        const next = (prev + 1) % progressMessages.length
        setFadeKey((k) => k + 1) // Force re-render for fade effect
        return next
      })
    }, 2500) // Change message every 2.5 seconds

    return () => clearInterval(interval)
  }, [isActive])

  if (!isActive) return null

  const currentMessage = progressMessages[currentMessageIndex]
  const Icon = currentMessage.icon
  const progress = ((currentMessageIndex + 1) / progressMessages.length) * 100

  return (
    <Card className="rounded-none border-zinc-800 bg-black animate-in fade-in-50 duration-300">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
            <div className="absolute inset-0 h-6 w-6 animate-ping opacity-20">
              <Loader2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1" key={fadeKey}>
              <Icon className="h-4 w-4 text-zinc-400 flex-shrink-0" />
              <p className="font-mono text-sm text-white animate-in fade-in-50 duration-300">
                {currentMessage.text}
              </p>
            </div>
            <p className="font-mono text-xs text-zinc-500 mb-2 animate-in fade-in-50 duration-300">
              {currentMessage.description}
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full bg-white transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-1.5">
          {progressMessages.map((msg, index) => (
            <div
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full transition-all duration-500",
                index < currentMessageIndex
                  ? "bg-white"
                  : index === currentMessageIndex
                    ? "bg-white/60"
                    : "bg-zinc-800"
              )}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

