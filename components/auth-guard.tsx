"use client"

import type React from "react"

import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export function AuthGuard({ children, requireAuth = true }: AuthGuardProps) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !loading) {
      if (requireAuth && !user) {
        router.push("/login")
      } else if (!requireAuth && user) {
        router.push("/")
      }
    }
  }, [user, loading, requireAuth, router, mounted])

  // Show loading state during initial mount to prevent hydration mismatch
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">إ</span>
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (requireAuth && !user) {
    return null // Will redirect to login
  }

  if (!requireAuth && user) {
    return null // Will redirect to main app
  }

  return <>{children}</>
}
