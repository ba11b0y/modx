"use client"

import type React from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Upload, ShieldAlert, Database } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items?: {
    href: string
    title: string
    icon: React.ReactNode
  }[]
}

export function SidebarNav({ className, ...props }: SidebarNavProps) {
  const pathname = usePathname()

  const items = [
    {
      title: "Overview",
      href: "/",
      icon: <LayoutDashboard className="w-4 h-4 mr-2" />,
    },
    {
      title: "Model Checks",
      href: "/checks",
      icon: <Upload className="w-4 h-4 mr-2" />,
    },
    {
      title: "Alerts",
      href: "/alerts",
      icon: <ShieldAlert className="w-4 h-4 mr-2" />,
    },
    {
      title: "Models",
      href: "/models",
      icon: <Database className="w-4 h-4 mr-2" />,
    },
  ]

  return (
    <nav className={cn("flex flex-col space-y-1 w-64 border-r min-h-screen p-4 bg-black", className)} {...props}>
      <div className="px-2 py-4 mb-6">
        <h2 className="text-lg font-bold tracking-tight uppercase border-b border-white/20 pb-4">Neural Control</h2>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <Button
            key={item.href}
            variant={pathname === item.href ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start text-sm font-mono",
              pathname === item.href
                ? "bg-white text-black hover:bg-white/90"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900",
            )}
            asChild
          >
            <Link href={item.href}>
              {item.icon}
              {item.title}
            </Link>
          </Button>
        ))}
      </div>
      <div className="mt-auto px-2">
        <div className="flex items-center gap-2 p-2 rounded-md bg-zinc-900 border border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-zinc-400">System Operational</span>
        </div>
      </div>
    </nav>
  )
}
