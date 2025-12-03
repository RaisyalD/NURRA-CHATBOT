"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun, Menu, LogOut } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useI18n } from "@/lib/i18n"

interface HeaderProps {
  onToggleSidebar?: () => void
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { signOut, user } = useAuth()
  const router = useRouter()
  const logoRef = useRef<HTMLDivElement | null>(null)
  const { t } = useI18n()

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = (resolvedTheme || theme) === "dark"

  const toggleTheme = () => {
    const logo = logoRef.current
    const docEl = document.documentElement
    const body = document.body as HTMLBodyElement

    if (!logo) {
      setTheme(isDark ? 'light' : 'dark')
      return
    }

    const rect = logo.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2

    const vw = Math.max(docEl.clientWidth, window.innerWidth || 0)
    const vh = Math.max(docEl.clientHeight, window.innerHeight || 0)
    const dx = Math.max(cx, vw - cx)
    const dy = Math.max(cy, vh - cy)
    const maxRadius = Math.sqrt(dx * dx + dy * dy)

    const styles = getComputedStyle(docEl)
    const targetBg = isDark
      ? styles.getPropertyValue('--background').trim() // switching to light
      : styles.getPropertyValue('--background').trim() // switching to dark; will update after mid-switch

    const startTime = performance.now()
    const duration = 500
    let themeSwitched = false

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration)
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      const radius = Math.max(0, eased * maxRadius)

      // Paint a radial gradient on body background-image without covering UI
      body.style.backgroundImage = `radial-gradient(circle ${radius}px at ${cx}px ${cy}px, ${isDark ? 'oklch(1 0 0)' : 'oklch(0.145 0 0)'} 0, ${isDark ? 'oklch(1 0 0)' : 'oklch(0.145 0 0)'} ${radius}px, transparent ${radius + 1}px)`

      if (!themeSwitched && t >= 0.3) {
        themeSwitched = true
        setTheme(isDark ? 'light' : 'dark')
      }

      if (t < 1) {
        requestAnimationFrame(animate)
      } else {
        // Clear inline background to return control to CSS vars
        setTimeout(() => {
          body.style.backgroundImage = ''
        }, 50)
      }
    }

    requestAnimationFrame(animate)
  }

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <header className="border-b border-border bg-card px-4 py-3 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggleSidebar}
            className="hover:bg-muted transition-colors"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div
              ref={logoRef}
              onClick={toggleTheme}
              role="button"
              aria-label="Toggle theme"
              tabIndex={0}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 bg-emerald-600 cursor-pointer select-none"
            >
              <span className="text-white font-bold text-sm transition-opacity">إ</span>
            </div>
            <h1 className="font-semibold text-lg transition-colors duration-300">NURRA</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {user && (
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('ui.welcome')} {user.fullName}</span>
              </div>
            )}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="relative overflow-hidden">
            {/* Cross-fade icons */}
            <Sun className={`h-5 w-5 absolute inset-0 m-auto transition-opacity duration-300 ${mounted && isDark ? "opacity-100" : "opacity-0"}`} />
            <Moon className={`h-5 w-5 transition-opacity duration-300 ${mounted && !isDark ? "opacity-100" : "opacity-0"}`} />
            <span className="sr-only">Toggle theme</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}
