"use client"

import type * as React from "react"
import { FlaskConical } from "lucide-react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { ModxLogo } from "@/components/logo"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Analyze",
    url: "/eval-playground",
    icon: FlaskConical,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2 font-mono font-bold">
          <ModxLogo className="h-6 w-6" />
          <span>modx</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          System Operational
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
