"use client"

import { cn } from "@/lib/utils"

import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle2, GitCompare, Box, Activity } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, Tooltip } from "recharts"

// Mock data for activation analysis
const activationData = Array.from({ length: 50 }, (_, i) => ({
  layer: `L${i}`,
  intensity: Math.random() * 100,
  baseline: Math.random() * 100,
}))

const diffData = [
  { parameter: "attention_dropout", current: "0.1", baseline: "0.1", status: "match" },
  { parameter: "hidden_size", current: "768", baseline: "768", status: "match" },
  { parameter: "num_attention_heads", current: "12", baseline: "12", status: "match" },
  { parameter: "vocab_size", current: "30522", baseline: "30000", status: "diff" },
  { parameter: "activation_function", current: "gelu", baseline: "relu", status: "diff" },
]

export default function ChecksPage() {
  return (
    <DashboardShell>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-2xl font-bold tracking-tight">Model Checks</h2>
            <p className="text-sm text-muted-foreground font-mono">bert-base-uncased vs. production-v1</p>
          </div>
          <Badge variant="outline" className="font-mono">
            Analysis Complete
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2">
                <GitCompare className="h-4 w-4" />
                Configuration Diff
              </CardTitle>
              <CardDescription className="font-mono text-xs">Differences from baseline configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-1">
                  {diffData.map((item) => (
                    <div
                      key={item.parameter}
                      className="grid grid-cols-12 items-center gap-4 border-b border-border py-3 text-sm last:border-0"
                    >
                      <div className="col-span-4 font-mono text-muted-foreground">{item.parameter}</div>
                      <div className="col-span-3 font-mono">{item.baseline}</div>
                      <div className="col-span-1 flex justify-center">
                        {item.status === "match" ? (
                          <span className="text-muted-foreground">→</span>
                        ) : (
                          <span className="text-destructive">≠</span>
                        )}
                      </div>
                      <div
                        className={cn("col-span-3 font-mono", item.status === "diff" && "text-destructive font-bold")}
                      >
                        {item.current}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {item.status === "match" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Layer Activations
              </CardTitle>
              <CardDescription className="font-mono text-xs">Mean activation intensity per layer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={activationData}>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border border-border bg-background p-2 shadow-sm">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">Current</span>
                                  <span className="font-bold text-muted-foreground">
                                    {Number(payload[0].value).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">Baseline</span>
                                  <span className="font-bold text-muted-foreground">
                                    {Number(payload[1].value).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar dataKey="intensity" fill="currentColor" className="fill-primary" radius={[4, 4, 0, 0]} />
                    <Bar
                      dataKey="baseline"
                      fill="currentColor"
                      className="fill-muted-foreground/20"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono flex items-center gap-2">
              <Box className="h-4 w-4" />
              Layer Architecture Analysis
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Detailed breakdown of model layers and parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-mono">Architecture Mismatch Detected</AlertTitle>
                <AlertDescription className="font-mono text-xs">
                  The current model uses GELU activation while the baseline uses RELU. This may affect model behavior
                  and compatibility.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-8 gap-1 font-mono text-xs">
                {Array.from({ length: 64 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded border border-border transition-colors hover:bg-muted cursor-help",
                      i % 7 === 0 ? "bg-destructive/20 border-destructive/50" : "bg-card",
                    )}
                    title={`Layer ${i}: ${Math.random() > 0.5 ? "Normal" : "High Activation"}`}
                  >
                    L{i}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  )
}
