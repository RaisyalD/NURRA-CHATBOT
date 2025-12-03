"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useChatStore } from "@/lib/chat-store"
import { supabase } from "@/lib/supabase"

// Interface untuk data pengguna
interface User {
  id: string
  email: string
  fullName: string
}

// Interface untuk konteks autentikasi
interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
}

// Membuat konteks React untuk autentikasi
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Komponen provider untuk autentikasi
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State untuk menyimpan data pengguna yang sedang login
  const [user, setUser] = useState<User | null>(null)
  // State untuk menandai apakah sedang loading
  const [loading, setLoading] = useState(true)
  // State untuk mencegah hydration mismatch
  const [mounted, setMounted] = useState(false)

  // Effect untuk inisialisasi autentikasi saat komponen dimount
  useEffect(() => {
    setMounted(true)
    
    // Fungsi async untuk mengambil data user dari Supabase
    const init = async () => {
      try {
        // Mengambil data user dari Supabase auth
        const { data } = await supabase.auth.getUser()
        const u = data?.user
        
        // Jika user ditemukan, set state user dengan data yang ada
        if (u) {
          setUser({ 
            id: u.id, 
            email: u.email || "", 
            fullName: u.user_metadata?.full_name || u.email?.split('@')[0] || "" 
          })
          
          // Untuk local storage saja, session otomatis dimuat dari localStorage
          console.log('App initialized, sessions will be loaded from local storage')
        }
      } finally {
        // Set loading menjadi false setelah proses selesai
        setLoading(false)
      }
    }
    
    // Jalankan fungsi init
    init()
    
    // Subscribe ke perubahan state autentikasi Supabase
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user
      
      // Jika ada session (user login), update state user
      if (u) {
        setUser({ 
          id: u.id, 
          email: u.email || "", 
          fullName: u.user_metadata?.full_name || u.email?.split('@')[0] || "" 
        })
        
        // Untuk local storage saja, session otomatis dimuat dari localStorage
        console.log('Auth state changed, sessions will be loaded from local storage')
      } else {
        // Jika tidak ada session (user logout), set user menjadi null
        setUser(null)
      }
    })
    
    // Cleanup function untuk unsubscribe saat komponen unmount
    return () => { sub.subscription.unsubscribe() }
  }, [])

  // Fungsi untuk menormalisasi email (trim dan lowercase)
  const normalizeEmail = (email: string) => email.trim().toLowerCase()

  // Fungsi untuk memigrasi session guest ke user yang login
  const migrateGuestSessions = (targetUserId: string) => {
    try {
      // Ambil state dari chat store
      const state = useChatStore.getState()
      // Ambil session guest yang ada
      const guestSessions = state.sessionsByUser['guest'] || []
      
      // Jika tidak ada session guest, keluar dari fungsi
      if (guestSessions.length === 0) return

      // Ambil session user yang sudah ada
      const targetSessions = state.sessionsByUser[targetUserId] || []
      
      // Gabungkan session guest dengan session user
      const nextSessionsByUser = {
        ...state.sessionsByUser,
        [targetUserId]: [...guestSessions, ...targetSessions],
        guest: [], // Kosongkan session guest
      }
      
      // Set session aktif untuk user
      const nextActiveByUser = {
        ...state.activeSessionIdByUser,
        [targetUserId]: state.activeSessionIdByUser[targetUserId] || state.activeSessionIdByUser['guest'] || (guestSessions[0]?.id ?? null),
        guest: null, // Reset session aktif guest
      }
      
      // Update state chat store dengan data yang baru
      useChatStore.setState({ sessionsByUser: nextSessionsByUser, activeSessionIdByUser: nextActiveByUser })
    } catch (e) {
      // Log error jika migrasi gagal
      console.warn('Guest session migration failed:', e)
    }
  }

  // Fungsi untuk login user
  const signIn = async (email: string, password: string) => {
    // Panggil API Supabase untuk login dengan email dan password
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email: normalizeEmail(email), 
      password 
    })
    
    // Jika ada error, throw error tersebut
    if (error) throw error
    
    // Ambil data user dari response
    const u = data.user
    
    // Set state user dengan data yang berhasil login
    setUser({ 
      id: u.id, 
      email: u.email || "", 
      fullName: u.user_metadata?.full_name || u.email?.split('@')[0] || "" 
    })
    
    // Migrasi session guest ke user yang login
    migrateGuestSessions(u.id)
    
    // Untuk local storage saja, session otomatis dimuat dari localStorage
    // Tidak perlu panggil database
    console.log('User signed in, sessions will be loaded from local storage')
  }

  // Fungsi untuk registrasi user baru
  const signUp = async (email: string, password: string, fullName: string) => {
    // Panggil API Supabase untuk registrasi dengan email, password, dan fullName
    const { data, error } = await supabase.auth.signUp({ 
      email: normalizeEmail(email), 
      password, 
      options: { data: { full_name: fullName } } 
    })
    
    // Jika ada error, throw error tersebut
    if (error) throw error
    
    // Ambil data user dari response
    const u = data.user
    
    // Jika user berhasil dibuat, set state user
    if (u) {
      setUser({ 
        id: u.id, 
        email: u.email || "", 
        fullName: fullName || u.email?.split('@')[0] || "" 
      })
      
      // Migrasi session guest ke user yang baru registrasi
      migrateGuestSessions(u.id)
      
      // Untuk local storage saja, session otomatis dimuat dari localStorage
      // Tidak perlu panggil database
      console.log('User signed up, sessions will be loaded from local storage')
    }
  }

  // Fungsi untuk logout user
  const signOut = async () => {
    // Panggil API Supabase untuk logout
    await supabase.auth.signOut()
    // Set state user menjadi null
    setUser(null)
  }

  // Jangan render apapun sampai mounted untuk mencegah hydration mismatch
  if (!mounted) {
    return <>{children}</>
  }

  // Return provider dengan value yang berisi state dan fungsi autentikasi
  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
}

// Hook untuk menggunakan konteks autentikasi
export function useAuth() {
  // Ambil konteks dari AuthContext
  const context = useContext(AuthContext)
  
  // Jika konteks undefined, throw error karena hook ini harus digunakan dalam AuthProvider
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  
  // Return konteks yang berisi data dan fungsi autentikasi
  return context
}
