"use client"

import { useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileDiff, Layers, BarChart3, Box } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock history data
const historyData = [
  {
    id: "v1.2.0",
    model: "llama-3-8b-instruct-v1",
    timestamp: "2 hours ago",
    author: "system",
    status: "active",
    changes: "Quantization parameters updated",
    diff: {
      added: ["layer.norm.weight"],
      modified: ["attn.c_attn.weight", "mlp.c_fc.weight"],
      removed: [],
      kl: [
        { layer: "layers.0", value: 0.0012 },
        { layer: "layers.1", value: 0.0045 },
        { layer: "layers.12", value: 0.125 },
      ],
    },
  },
  {
    id: "v1.1.0",
    model: "llama-3-8b-base",
    timestamp: "1 day ago",
    author: "user_deploy",
    status: "inactive",
    changes: "Base model upload",
    diff: {
      added: ["config.json", "pytorch_model.bin"],
      modified: [],
      removed: [],
      kl: [],
    },
  },
  {
    id: "v0.9.0",
    model: "mistral-7b-finetune-rc3",
    timestamp: "2 days ago",
    author: "system",
    status: "archived",
    changes: "Fine-tuning checkpoint #400",
    diff: {
      added: [],
      modified: ["layers.12.self_attn"],
      removed: [],
      kl: [{ layer: "layers.12", value: 0.089 }],
    },
  },
]

export default function HistoryPage() {
  const [selectedModel, setSelectedModel] = useState(historyData[0])

  return (
    <DashboardShell>
      <div className="flex flex-col h-[calc(100vh-4rem)] p-4 gap-4 md:flex-row">
        {/* History List */}
        <Card className="w-full md:w-1/3 rounded-none border-zinc-800 bg-black flex flex-col">
          <CardHeader>
            <CardTitle className="font-mono text-lg text-white">Model History</CardTitle>
            <CardDescription className="font-mono text-xs text-zinc-500">Upload timeline and versions</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-0">
            <ScrollArea className="h-full">
              <div className="flex flex-col">
                {historyData.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedModel(item)}
                    className={cn(
                      "flex flex-col gap-2 border-b border-zinc-900 p-4 text-left transition-colors hover:bg-zinc-900/50",
                      selectedModel.id === item.id ? "bg-zinc-900" : "",
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Box className="h-4 w-4 text-zinc-500" />
                        <span className="font-mono text-xs text-zinc-400">{item.model}</span>
                      </div>
                      <span className="font-mono text-[10px] text-zinc-600">{item.timestamp}</span>
                    </div>
                    <div className="font-mono text-sm font-bold text-white pl-6">{item.id}</div>
                    <div className="font-mono text-xs text-zinc-500 pl-6">{item.changes}</div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Diff View */}
        <Card className="flex-1 rounded-none border-zinc-800 bg-black flex flex-col">
          <CardHeader className="border-b border-zinc-900">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="font-mono text-lg text-white flex items-center gap-2">
                  <FileDiff className="h-5 w-5 text-zinc-400" />
                  {selectedModel.model}
                </CardTitle>
                <CardDescription className="font-mono text-xs text-zinc-500">
                  Comparing to previous baseline
                </CardDescription>
              </div>
              <Badge variant="outline" className="rounded-none border-zinc-800 font-mono text-zinc-400">
                {selectedModel.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Tabs defaultValue="features" className="h-full flex flex-col">
              <TabsList className="w-full justify-start rounded-none border-b border-zinc-900 bg-black p-0 h-10">
                <TabsTrigger
                  value="features"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-zinc-900 font-mono text-xs h-full px-4"
                >
                  Feature Changes
                </TabsTrigger>
                <TabsTrigger
                  value="layers"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-zinc-900 font-mono text-xs h-full px-4"
                >
                  Layer Diff
                </TabsTrigger>
                <TabsTrigger
                  value="kl"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-white data-[state=active]:bg-zinc-900 font-mono text-xs h-full px-4"
                >
                  KL Divergence
                </TabsTrigger>
              </TabsList>

              <TabsContent value="features" className="flex-1 p-4 m-0">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <h4 className="font-mono text-xs font-bold text-zinc-500 uppercase">Modified Features</h4>
                    {selectedModel.diff.modified.length > 0 ? (
                      selectedModel.diff.modified.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center justify-between p-3 bg-zinc-900/30 border border-yellow-900/30"
                        >
                          <span className="font-mono text-sm text-yellow-500">{feature}</span>
                          <span className="font-mono text-xs text-zinc-600">Variance: 0.045</span>
                        </div>
                      ))
                    ) : (
                      <div className="font-mono text-xs text-zinc-600 italic">No modified features</div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <h4 className="font-mono text-xs font-bold text-zinc-500 uppercase">Added Features</h4>
                    {selectedModel.diff.added.length > 0 ? (
                      selectedModel.diff.added.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center justify-between p-3 bg-zinc-900/30 border border-green-900/30"
                        >
                          <span className="font-mono text-sm text-green-500">{feature}</span>
                          <span className="font-mono text-xs text-zinc-600">New Tensor</span>
                        </div>
                      ))
                    ) : (
                      <div className="font-mono text-xs text-zinc-600 italic">No added features</div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="layers" className="flex-1 p-4 m-0">
                <div className="flex items-center justify-center h-full border-2 border-dashed border-zinc-800 text-zinc-600 font-mono text-sm">
                  <Layers className="mr-2 h-4 w-4" />
                  Layer Visualization Placeholder
                </div>
              </TabsContent>

              <TabsContent value="kl" className="flex-1 p-4 m-0">
                <div className="space-y-2">
                  <h4 className="font-mono text-xs font-bold text-zinc-500 uppercase mb-4">KL Divergence by Layer</h4>
                  {selectedModel.diff.kl.length > 0 ? (
                    selectedModel.diff.kl.map((item) => (
                      <div key={item.layer} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono text-zinc-400">
                          <span>{item.layer}</span>
                          <span>{item.value.toFixed(4)}</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-900 overflow-hidden">
                          <div className="h-full bg-white" style={{ width: `${Math.min(item.value * 1000, 100)}%` }} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32 border border-dashed border-zinc-800 text-zinc-600 font-mono text-xs">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      No KL Divergence data available for this diff
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
