"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, ThumbsUp, ThumbsDown, BookOpen, Brain, Search } from "lucide-react"
import { useI18n } from "@/lib/i18n"
import { useChatStore } from "@/lib/chat-store"
import { useAuth } from "@/lib/auth"
import { MarkdownText } from "@/components/markdown-text"

// Fungsi utility untuk mendapatkan inisial nama pengguna
const getUserInitials = (fullName: string): string => {
  // Jika nama kosong, return "U" (User)
  if (!fullName) return "U"
  
  // Split nama berdasarkan spasi
  const words = fullName.trim().split(" ")
  
  // Jika hanya satu kata, ambil huruf pertama
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase()
  }
  
  // Jika lebih dari satu kata, ambil huruf pertama dari kata pertama dan terakhir
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}

// Komponen utama untuk interface chat
export function ChatInterface() {
  // Hook untuk internationalization (i18n)
  const { t, language } = useI18n()
  // Hook untuk autentikasi user
  const { user } = useAuth()
  // Ambil user ID atau gunakan "guest" jika belum login
  const userId = user?.id || "guest"

  // State untuk input text dari user
  const [input, setInput] = useState("")
  // State untuk menandai apakah sedang loading response
  const [isLoading, setIsLoading] = useState(false)
  // State untuk index animasi thinking steps
  const [thinkingIndex, setThinkingIndex] = useState(0)
  // Ref untuk scroll area agar bisa auto scroll ke bawah
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Ambil store untuk mengelola state chat
  const store = useChatStore()
  // Ambil session aktif untuk user saat ini
  const activeSession = store.getActiveSession(userId)
  // Ambil ID session aktif
  const activeSessionId = activeSession?.id || null
  // Ambil semua pesan dari session aktif
  const messages = activeSession?.messages || []

  // Effect untuk membuat session awal jika belum ada
  useEffect(() => {
    // Jika tidak ada session aktif dan tidak ada activeSession
    if (!activeSessionId && !activeSession) {
      // Cek apakah user sudah punya session yang ada
      const userSessions = store.sessionsByUser[userId] || []
      
      // Jika tidak ada session sama sekali, buat session baru
      if (userSessions.length === 0) {
        store.createSession(userId)
      } else {
        // Jika ada session, gunakan session yang paling terbaru
        const mostRecentSession = userSessions[0]
        store.setActiveSession(userId, mostRecentSession.id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId, activeSession, userId])

  // Effect untuk auto-scroll ke bawah ketika ada pesan baru
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Array untuk animasi thinking steps saat loading
  const thinkingSteps = [
    { icon: Brain, label: t('thinking.analyze'), detail: t('thinking.analyzeDetail') },
    { icon: Search, label: t('thinking.search'), detail: t('thinking.searchDetail') },
    { icon: BookOpen, label: t('thinking.summarize'), detail: t('thinking.summarizeDetail') },
  ] as const

  // Effect untuk animasi thinking steps saat loading
  useEffect(() => {
    // Jika tidak loading, reset thinking index ke 0
    if (!isLoading) {
      setThinkingIndex(0)
      return
    }
    
    // Flag untuk cancel interval jika komponen unmount
    let cancelled = false
    
    // Set interval untuk mengubah thinking index setiap 1.2 detik
    const interval = setInterval(() => {
      if (cancelled) return
      setThinkingIndex((i) => (i + 1) % thinkingSteps.length)
    }, 1200)
    
    // Cleanup function untuk clear interval
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isLoading])

  // Fungsi untuk mengirim pesan ke AI
  const handleSend = async () => {
    // Jika input kosong atau tidak ada session aktif, keluar dari fungsi
    if (!input.trim() || !activeSessionId) return

    // Simpan konten pesan user dan reset input
    const userMessageContent = input.trim()
    setInput("")
    // Set loading menjadi true
    setIsLoading(true)

    // Tambahkan pesan user ke store (remote + optimistic)
    // Note: addMessageRemote akan handle ensureRemoteSession secara internal
    store.addMessageRemote(userId, activeSessionId, {
      role: "user",
      content: userMessageContent,
    })

    try {
      // Kirim request ke API chat
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            // Kirim semua pesan sebelumnya untuk context
            ...messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            // Tambahkan pesan user yang baru
            {
              role: "user" as const,
              content: userMessageContent,
            },
          ],
        }),
      })

      // Jika response tidak OK, handle error
      if (!response.ok) {
        // Coba parse JSON error
        try {
          const errJson = await response.json()
          throw new Error(errJson?.error || errJson?.details || "Failed to get response")
        } catch (e) {
          throw new Error("Failed to get response")
        }
      }

      // Ambil content type dari response
      const contentType = response.headers.get("Content-Type") || ""

      // Path untuk response JSON non-streaming
      if (contentType.includes("application/json")) {
        // Parse response JSON
        const data = await response.json()
        const assistantMessage = data?.content || data?.message || ""
        
        // Jika ada pesan assistant, tambahkan ke store
        if (assistantMessage) {
          store.addMessageRemote(userId, activeSessionId, {
            role: "assistant",
            content: assistantMessage,
          })
        }
        // Set loading menjadi false dan return
        setIsLoading(false)
        return
      }

      // Path untuk streaming response (SSE atau raw text)
      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      // Variabel untuk menyimpan pesan assistant yang sedang di-stream
      let assistantMessage = ""
      const decoder = new TextDecoder()

      // Loop untuk membaca stream response
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)

        // Coba parse format SSE: baris yang dimulai dengan "data: "
        const lines = chunk.split("\n")
        let sseParsed = false
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") {
              sseParsed = true
              break
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === "text-delta" && parsed.textDelta) {
                assistantMessage += parsed.textDelta
                sseParsed = true
              }
            } catch {
              // bukan JSON, ignore
            }
          }
        }

        // Fallback: treat sebagai raw text chunk
        if (!sseParsed && chunk) {
          assistantMessage += chunk
        }
      }

      // Tambahkan pesan assistant ke store (fallback jika kosong)
      store.addMessageRemote(userId, activeSessionId, {
        role: "assistant",
        content: assistantMessage || t('error.generic'),
      })
    } catch (error: unknown) {
      // Log error dan tambahkan pesan error ke store
      console.error("Error sending message:", error)
      store.addMessageRemote(userId, activeSessionId, {
        role: "assistant",
        content: t('error.generic'),
      })
    } finally {
      // Set loading menjadi false setelah semua proses selesai
      setIsLoading(false)
    }
  }

  // Fungsi untuk handle key press pada textarea
  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Jika user tekan Enter tanpa Shift, kirim pesan
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Fungsi untuk handle feedback (thumbs up/down) pada pesan assistant
  const handleFeedback = (messageId: string, feedback: "thumbs_up" | "thumbs_down" | null) => {
    // Jika tidak ada session aktif, keluar dari fungsi
    if (!activeSessionId) return
    
    // Update feedback pesan di store
    store.updateMessageFeedback(userId, activeSessionId, messageId, feedback)
  }

  // Jika tidak ada session aktif, tampilkan welcome screen
  if (!activeSession) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="text-center px-6">
          {/* Logo Islamic AI Assistant */}
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
            <span className="text-white font-bold text-2xl">إ</span>
          </div>
          {/* Judul welcome */}
          <h2 className="text-xl font-semibold mb-2">{t('chat.welcomeTitle')}</h2>
          {/* Subtitle welcome */}
          <p className="text-muted-foreground">{t('chat.welcomeSubtitle')}</p>
        </div>
      </div>
    )
  }

  // Return komponen utama chat interface
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Area untuk menampilkan pesan-pesan */}
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto" ref={scrollAreaRef}>
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
            {/* Loop untuk menampilkan setiap pesan */}
            {messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {/* Avatar untuk pesan assistant */}
                {message.role === "assistant" && (
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow">
                    <span className="text-white font-bold text-sm">إ</span>
                  </div>
                )}
                
                {/* Bubble pesan */}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm border ${
                    message.role === "user"
                      ? "bg-emerald-600 text-white border-transparent"
                      : "bg-card text-foreground border-border"
                  }`}
                >
                  {/* Konten pesan dengan markdown support */}
                  <MarkdownText>{message.content}</MarkdownText>
                  
                  {/* Footer pesan dengan timestamp dan feedback */}
                  <div className="flex items-center justify-between mt-2">
                    {/* Timestamp pesan */}
                    <p className={`text-[10px] ${message.role === "user" ? "text-emerald-100" : "text-muted-foreground"}`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                    
                    {/* Tombol feedback untuk pesan assistant */}
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-1">
                        {/* Tombol thumbs up */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 w-6 p-0 ${
                            message.feedback === "thumbs_up" 
                              ? "text-green-600 hover:text-green-700" 
                              : "text-muted-foreground hover:text-green-600"
                          }`}
                          onClick={() => handleFeedback(
                            message.id, 
                            message.feedback === "thumbs_up" ? null : "thumbs_up"
                          )}
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        
                        {/* Tombol thumbs down */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-6 w-6 p-0 ${
                            message.feedback === "thumbs_down" 
                              ? "text-red-600 hover:text-red-700" 
                              : "text-muted-foreground hover:text-red-600"
                          }`}
                          onClick={() => handleFeedback(
                            message.id, 
                            message.feedback === "thumbs_down" ? null : "thumbs_down"
                          )}
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Avatar untuk pesan user */}
                {message.role === "user" && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0 shadow">
                    <span className="text-primary-foreground font-bold text-sm">{getUserInitials(user?.fullName || "")}</span>
                  </div>
                )}
              </div>
            ))}
            {/* Loading animation saat AI sedang memproses */}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                {/* Avatar AI saat loading */}
                <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 shadow">
                  <span className="text-white font-bold text-sm">إ</span>
                </div>
                
                {/* Bubble loading dengan animasi thinking steps */}
                <div className="bg-card border border-border rounded-2xl px-4 py-3 shadow-sm max-w-[80%]">
                  {/* Thinking steps chips */}
                  <div className="flex flex-wrap items-center gap-2 text-[13px] leading-none">
                    {thinkingSteps.map((step, idx) => {
                      const Icon = step.icon
                      const isActive = idx === thinkingIndex
                      const isDone = idx < thinkingIndex
                      const chipClass = isDone
                        ? 'bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border-emerald-600/30'
                        : isActive
                          ? 'bg-primary/10 text-foreground border-primary/30'
                          : 'bg-muted text-muted-foreground border-border'
                      return (
                        <span
                          key={step.label}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${chipClass}`}
                        >
                          <Icon className={`h-3.5 w-3.5`} />
                          <span className="whitespace-nowrap">{step.label}</span>
                        </span>
                      )
                    })}
                  </div>
                  
                  {/* Detail dari thinking step yang aktif */}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {thinkingSteps[thinkingIndex].detail}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3 h-1.5 w-full bg-muted rounded overflow-hidden">
                    <div
                      className="h-1.5 rounded transition-all duration-700 ease-out"
                      style={{
                        width: `${((thinkingIndex + 1) / thinkingSteps.length) * 100}%`,
                        background:
                          'linear-gradient(90deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.6) 50%, rgba(16,185,129,1) 100%)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Area input yang sticky di bagian bawah */}
      <div className="border-t border-border backdrop-blur supports-[backdrop-filter]:bg-background/75 sticky bottom-0 w-full">
        <div className="mx-auto max-w-3xl px-4 py-3">
          <div className="flex gap-2">
            {/* Textarea untuk input pesan */}
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('chat.placeholder')}
              className="flex-1 min-h-[56px] max-h-[180px] resize-y"
              disabled={isLoading}
            />
            
            {/* Tombol send */}
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !activeSessionId}
              size="icon"
              className="h-[56px] w-[56px] bg-emerald-600 hover:bg-emerald-700"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Footer note */}
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            {t('chat.footerNote')}
          </p>
        </div>
      </div>
    </div>
  )
}
