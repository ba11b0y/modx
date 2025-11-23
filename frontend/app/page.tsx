"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to eval playground
    router.replace("/eval-playground")
  }, [router])

  return null
}
