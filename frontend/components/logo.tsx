import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
}

export function ModxLogo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center justify-center font-mono font-bold tracking-tighter", className)}>
      <span className="text-zinc-400 text-lg">|</span>
      <span className="mx-0.5 text-xl text-white">x</span>
      <span className="text-zinc-400 text-lg">|</span>
    </div>
  )
}
