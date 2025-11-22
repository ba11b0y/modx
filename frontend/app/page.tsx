"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ModelUploader } from "@/components/model-uploader"
import { GitCommit, AlertTriangle } from "lucide-react"

export default function HomePage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = (url: string) => {
    setIsAnalyzing(true)
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false)
    }, 2000)
  }

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight font-mono">Overview</h2>
          <div className="flex items-center space-x-2"></div>
        </div>

        <div className="w-full">
          <ModelUploader onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-mono text-zinc-400">Model Revisions</CardTitle>
              <GitCommit className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-white">24</div>
              <p className="text-xs font-mono text-zinc-500">+2 from last week</p>
            </CardContent>
          </Card>

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
