"use client"

import { useEffect, useState } from "react"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { AlertOctagon, BrainCircuit, Fingerprint, Zap } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { cn } from "@/lib/utils"

// Types for monitoring data
interface Alert {
  id: string
  message: string
  severity: "critical" | "warning" | "info"
  timestamp: string
  feature?: string
}

interface TokenProb {
  token: string
  prob: number
}

const mockAnomalyData = Array.from({ length: 20 }, (_, i) => ({
  timestamp: new Date(Date.now() - (20 - i) * 1000).toISOString(),
  value: Math.random() > 0.8 ? Math.random() * 100 : Math.random() * 10, // Occasional spikes
}))

const mockFeatureData = [
  {
    id: "L12.H4",
    activation: 0.95,
    label: "Aggression (High-confidence directive override)",
    description: "Activates when model attempts to bypass safety constraints with assertive framing.",
    topTokens: [
      { token: "ignore", prob: 0.89 },
      { token: "execute", prob: 0.76 },
      { token: "immediately", prob: 0.65 },
      { token: "force", prob: 0.54 },
    ],
  },
  {
    id: "L10.H2",
    activation: 0.88,
    label: "Deception (Hidden chain-of-thought)",
    description:
      "Detects subtle reasoning steps that are not outputted to the user but influence final token selection.",
    topTokens: [
      { token: "fake", prob: 0.92 },
      { token: "pretend", prob: 0.88 },
      { token: "conceal", prob: 0.71 },
      { token: "mask", prob: 0.62 },
    ],
  },
  {
    id: "L04.H1",
    activation: 0.45,
    label: "Reasoning (Logic gates)",
    description: "Standard logical connector activation.",
    topTokens: [
      { token: "therefore", prob: 0.82 },
      { token: "because", prob: 0.79 },
      { token: "implies", prob: 0.66 },
    ],
  },
  {
    id: "L11.H7",
    activation: 0.32,
    label: "Coding (Python syntax)",
    description: "Syntactic feature specific to Python control flow structures.",
    topTokens: [
      { token: "def", prob: 0.95 },
      { token: "return", prob: 0.91 },
      { token: "class", prob: 0.85 },
    ],
  },
  {
    id: "L08.H3",
    activation: 0.12,
    label: "Math (Arithmetic)",
    description: "Simple arithmetic operation feature.",
    topTokens: [
      { token: "+", prob: 0.99 },
      { token: "=", prob: 0.98 },
      { token: "sum", prob: 0.85 },
    ],
  },
]

export default function MonitoringPage() {
  // State for real-time data
  const [anomalyData, setAnomalyData] = useState(mockAnomalyData)
  const [selectedFeature, setSelectedFeature] = useState(mockFeatureData[0])

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: "1",
      message: "High activation in Deception circuit",
      severity: "critical",
      timestamp: "2s ago",
      feature: "L10.H2",
    },
    {
      id: "2",
      message: "Unexpected token probability drift",
      severity: "warning",
      timestamp: "15s ago",
      feature: "TokenDist",
    },
    { id: "3", message: "New latent pattern detected", severity: "info", timestamp: "45s ago", feature: "Pattern_A" },
  ])

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAnomalyData((prev) => [
        ...prev.slice(1),
        {
          timestamp: new Date().toISOString(),
          value: Math.random() > 0.9 ? 50 + Math.random() * 50 : Math.random() * 20,
        },
      ])
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <DashboardShell>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-mono text-2xl font-bold tracking-tight">Anomaly Monitoring</h2>
            <p className="text-sm text-muted-foreground font-mono">Real-time feature activation and circuit analysis</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-xs font-bold text-red-500">LIVE SCANNING</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-zinc-400">Risk Score</CardTitle>
              <AlertOctagon className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold text-white">88/100</div>
              <p className="text-xs text-zinc-500 font-mono">Critical threshold exceeded</p>
            </CardContent>
          </Card>

          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-zinc-400">Active Circuits</CardTitle>
              <BrainCircuit className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold text-white">12</div>
              <p className="text-xs text-zinc-500 font-mono">Showing abnormal activity</p>
            </CardContent>
          </Card>

          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-zinc-400">Flagged Tokens</CardTitle>
              <Fingerprint className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold text-white">1,024</div>
              <p className="text-xs text-zinc-500 font-mono">Last 5 minutes</p>
            </CardContent>
          </Card>

          <Card className="rounded-none border-zinc-800 bg-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="font-mono text-sm font-medium text-zinc-400">Interventions</CardTitle>
              <Zap className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="font-mono text-2xl font-bold text-white">3</div>
              <p className="text-xs text-zinc-500 font-mono">Auto-corrected</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-7">
          {/* Main Charts Area */}
          <div className="col-span-5 space-y-6">
            {/* Anomaly Intensity Chart */}
            <Card className="rounded-none border-zinc-800 bg-black">
              <CardHeader>
                <CardTitle className="font-mono text-sm text-white">Anomaly Intensity (Global)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={anomalyData}>
                      <defs>
                        <linearGradient id="anomaly" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="timestamp" hide interval={5} />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12, fontFamily: "monospace", fill: "#71717a" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-none border border-red-900 bg-black p-2 font-mono text-xs text-white shadow-sm">
                                <div className="font-bold text-red-500">
                                  {Number(payload[0].value).toFixed(1)}% Deviation
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#ef4444"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#anomaly)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Feature Activations & Token Stream */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="rounded-none border-zinc-800 bg-black">
                <CardHeader>
                  <CardTitle className="font-mono text-sm text-white">Top Anomalous Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockFeatureData.map((feature) => (
                      <div
                        key={feature.id}
                        className={cn(
                          "space-y-1 p-2 cursor-pointer border border-transparent transition-all hover:bg-zinc-900",
                          selectedFeature.id === feature.id ? "bg-zinc-900 border-zinc-800" : "",
                        )}
                        onClick={() => setSelectedFeature(feature)}
                      >
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-zinc-400 truncate max-w-[70%]">
                            {feature.id} <span className="text-zinc-600">({feature.label})</span>
                          </span>
                          <span className={cn(feature.activation > 0.8 ? "text-red-500" : "text-zinc-400")}>
                            {(feature.activation * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-900">
                          <div
                            className={cn(
                              "h-full transition-all",
                              feature.activation > 0.8 ? "bg-red-600" : "bg-zinc-700",
                            )}
                            style={{ width: `${feature.activation * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-none border-zinc-800 bg-black">
                <CardHeader>
                  <CardTitle className="font-mono text-sm text-white">Analysis: {selectedFeature.id}</CardTitle>
                  <CardDescription
                    className="font-mono text-xs text-zinc-500 line-clamp-2"
                    title={selectedFeature.description}
                  >
                    {selectedFeature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h4 className="font-mono text-xs font-bold text-zinc-500 uppercase">Top k Tokens</h4>
                    <div className="space-y-2">
                      {selectedFeature.topTokens.map((token, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 bg-zinc-900/50 border border-zinc-800/50"
                        >
                          <code className="font-mono text-sm text-white bg-zinc-800 px-1.5 py-0.5 rounded-sm">
                            "{token.token}"
                          </code>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-zinc-800">
                              <div className="h-full bg-zinc-500" style={{ width: `${token.prob * 100}%` }} />
                            </div>
                            <span className="font-mono text-xs text-zinc-400 w-8 text-right">
                              {(token.prob * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Alert Feed */}
          <Card className="col-span-2 flex flex-col rounded-none border-zinc-800 bg-black">
            <CardHeader>
              <CardTitle className="font-mono flex items-center gap-2 text-white">
                <AlertOctagon className="h-4 w-4 text-red-500" />
                Anomaly Feed
              </CardTitle>
              <CardDescription className="font-mono text-xs text-zinc-500">Detected irregularities</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[550px]">
                <div className="space-y-1 p-4">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={cn(
                        "flex flex-col gap-1 border p-3 transition-colors",
                        alert.severity === "critical"
                          ? "border-red-900/50 bg-red-950/10"
                          : alert.severity === "warning"
                            ? "border-yellow-900/50 bg-yellow-950/10"
                            : "border-zinc-800 bg-zinc-950",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-mono text-[10px] uppercase rounded-none border-zinc-800",
                            alert.severity === "critical"
                              ? "text-red-500 border-red-900"
                              : alert.severity === "warning"
                                ? "text-yellow-500 border-yellow-900"
                                : "text-zinc-400",
                          )}
                        >
                          {alert.feature || "System"}
                        </Badge>
                        <span className="font-mono text-[10px] text-zinc-500">{alert.timestamp}</span>
                      </div>
                      <p className="font-mono text-xs font-medium leading-tight mt-1 text-zinc-300">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  )
}
