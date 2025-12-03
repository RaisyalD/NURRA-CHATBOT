"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

// Type untuk bahasa yang didukung
type Language = "en" | "id" | "ar"

// Type untuk messages/translations
type Messages = Record<string, string>

// Object yang berisi semua translations untuk setiap bahasa
const translations: Record<Language, Messages> = {
  en: {
    "ui.welcome": "Welcome,",
    "chat.placeholder": "Ask anything about Islam...",
    "chat.welcomeTitle": "Welcome to NURRA",
    "chat.welcomeSubtitle": "Start a new conversation to begin",
    "chat.footerNote": "This AI assistant provides Islamic guidance based on Qur'an and authentic Hadith",

    "thinking.analyze": "Analyzing the question",
    "thinking.analyzeDetail": "Understanding intent, keywords, and context",
    "thinking.search": "Searching references",
    "thinking.searchDetail": "Reviewing Qur'an, authentic hadith, and fiqh references",
    "thinking.summarize": "Summarizing a sound answer",
    "thinking.summarizeDetail": "Composing a concise answer with relevant evidences",
    "error.generic": "Sorry, I couldn't generate an answer right now. Please try again.",
  },
  id: {
    "ui.welcome": "Selamat datang,",
    "chat.placeholder": "Tanyakan apa saja seputar Islam...",
    "chat.welcomeTitle": "Selamat datang di NURRA",
    "chat.welcomeSubtitle": "Mulai percakapan baru untuk memulai",
    "chat.footerNote": "Asisten AI ini memberikan bimbingan Islam berdasarkan Al-Qur'an dan Hadits shahih",

    "thinking.analyze": "Menganalisis pertanyaan",
    "thinking.analyzeDetail": "Memahami maksud, kata kunci, dan konteks pertanyaan",
    "thinking.search": "Menelusuri sumber rujukan",
    "thinking.searchDetail": "Meninjau Al-Qur'an, hadits shahih, dan referensi fiqih",
    "thinking.summarize": "Merangkum jawaban yang shahih",
    "thinking.summarizeDetail": "Menyusun jawaban ringkas beserta dalil yang relevan",
    "error.generic": "Maaf, saya belum dapat menghasilkan jawaban saat ini. Silakan coba lagi.",
  },
  ar: {
    "ui.welcome": "مرحبًا،",
    "chat.placeholder": "اسأل أي شيء عن الإسلام...",
    "chat.welcomeTitle": "مرحبًا بك في نورا",
    "chat.welcomeSubtitle": "ابدأ محادثة جديدة للبدء",
    "chat.footerNote": "يقدّم هذا المساعد إرشادًا إسلاميًا اعتمادًا على القرآن والحديث الصحيح",

    "thinking.analyze": "تحليل السؤال",
    "thinking.analyzeDetail": "فهم المقصود والكلمات المفتاحية والسياق",
    "thinking.search": "البحث عن المراجع",
    "thinking.searchDetail": "مراجعة القرآن والحديث الصحيح ومراجع الفقه",
    "thinking.summarize": "تلخيص إجابة موثوقة",
    "thinking.summarizeDetail": "صياغة جواب موجز مع الأدلة المناسبة",
    "error.generic": "عذرًا، لم أتمكن من توليد الإجابة الآن. يرجى المحاولة لاحقًا.",
  },
}

// Type untuk value context i18n
type I18nContextValue = {
  language: Language // Bahasa yang sedang aktif
  setLanguage: (lang: Language) => void // Fungsi untuk mengubah bahasa
  t: (key: string) => string // Fungsi untuk translate key ke text
}

// Membuat context React untuk i18n
const I18nContext = createContext<I18nContextValue | undefined>(undefined)

// Komponen provider untuk i18n
export function I18nProvider({ children }: { children: React.ReactNode }) {
  // State untuk menyimpan bahasa yang sedang aktif (default: English)
  const [language, setLanguageState] = useState<Language>("en")

  // Effect untuk load bahasa dari localStorage saat komponen mount
  useEffect(() => {
    // Load dari settings atau dedicated key
    const stored =
      (typeof window !== "undefined" && localStorage.getItem("islamic-chat-language")) ||
      (typeof window !== "undefined"
        ? (() => {
            try {
              // Coba ambil dari settings general
              const raw = localStorage.getItem("islamic-chat-settings")
              if (!raw) return null
              const parsed = JSON.parse(raw)
              return parsed?.language as Language | undefined
            } catch {
              return null
            }
          })()
        : null)

    // Jika stored language valid, set sebagai bahasa aktif
    if (stored === "en" || stored === "id" || stored === "ar") {
      setLanguageState(stored)
    }
  }, [])

  // Callback untuk mengubah bahasa
  const setLanguage = useCallback((lang: Language) => {
    // Update state bahasa
    setLanguageState(lang)
    
    // Simpan ke localStorage
    try {
      localStorage.setItem("islamic-chat-language", lang)
    } catch {
      // Ignore error jika localStorage tidak tersedia
    }
  }, [])

  // Callback untuk translate key ke text
  const t = useCallback(
    (key: string) => {
      // Ambil translation table untuk bahasa aktif
      const table = translations[language]
      
      // Return translation atau fallback ke English atau key itu sendiri
      return table[key] ?? translations.en[key] ?? key
    },
    [language],
  )

  // Memoize value context untuk optimasi performance
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])
  
  // Return provider dengan value
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

// Hook untuk menggunakan context i18n
export function useI18n() {
  // Ambil context dari I18nContext
  const ctx = useContext(I18nContext)
  
  // Jika context undefined, throw error karena hook ini harus digunakan dalam I18nProvider
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  
  // Return context yang berisi language, setLanguage, dan t function
  return ctx
}

// Export type Language untuk digunakan di komponen lain
export type { Language }


